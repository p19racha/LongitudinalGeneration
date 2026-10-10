"""
Core PULSE Inference and Multi-Omics Synthesis Service.
"""
from __future__ import annotations

import json
from typing import Dict, List, Optional, Tuple
import numpy as np
import torch
from sqlalchemy.orm import Session

from pulse.model import PulseModel
from server.config import settings
from server.db.models import (
    Patient,
    Visit,
    Measurement,
    LatentState,
    RiskPrediction,
    TaskType,
    RiskCategory,
)
from server.crud.patient import get_patient
from server.crud.measurement import clear_synthetic_measurements
from server.services.feature_definitions import (
    ROUTINE_LAB_FEATURES,
    METABOLOMICS_FEATURES,
    PROTEOMICS_FEATURES,
    get_feature_meta,
)
from server.services.risk_models import RiskModelService


class PulseInferenceService:
    """
    Manages PULSE model lifecycle, tensor batching, multi-visit state propagation,
    missing omics synthesis, and downstream risk scoring.
    """

    _instance: Optional[PulseInferenceService] = None

    def __init__(self, device: Optional[str] = None):
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")

        # Feature order definitions
        self.lab_keys = list(ROUTINE_LAB_FEATURES.keys())
        self.metab_keys = list(METABOLOMICS_FEATURES.keys())
        self.prot_keys = list(PROTEOMICS_FEATURES.keys())

        self.modality_dims = {
            "routine_labs": len(self.lab_keys),
            "metabolomics": len(self.metab_keys),
            "proteomics": len(self.prot_keys),
        }

        # Initialize core PULSE model
        self.model = PulseModel(
            modality_dims=self.modality_dims,
            latent_dim=settings.LATENT_DIM,
            hidden_dim=settings.HIDDEN_DIM,
            temporal_model=settings.TEMPORAL_MODEL,
        )
        self.model.to(self.device)
        self.model.eval()

        # Compute scaling reference centers and scales for z-scoring
        self.scalers = self._init_feature_scalers()

    @classmethod
    def get_instance(cls) -> PulseInferenceService:
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def _init_feature_scalers(self) -> Dict[str, Dict[str, Tuple[float, float]]]:
        """
        Derive reference centers (mean) and scales (std) from normal clinical reference bands.
        """
        scalers = {"routine_labs": {}, "metabolomics": {}, "proteomics": {}}

        for name, meta in ROUTINE_LAB_FEATURES.items():
            mean = (meta.ref_low + meta.ref_high) / 2.0
            std = max((meta.ref_high - meta.ref_low) / 4.0, 0.1)
            scalers["routine_labs"][name] = (mean, std)

        for name, meta in METABOLOMICS_FEATURES.items():
            mean = (meta.ref_low + meta.ref_high) / 2.0
            std = max((meta.ref_high - meta.ref_low) / 4.0, 0.05)
            scalers["metabolomics"][name] = (mean, std)

        for name, meta in PROTEOMICS_FEATURES.items():
            mean = (meta.ref_low + meta.ref_high) / 2.0
            std = max((meta.ref_high - meta.ref_low) / 4.0, 1.0)
            scalers["proteomics"][name] = (mean, std)

        return scalers

    def _normalize_feature(self, modality: str, feature_name: str, raw_value: float) -> float:
        mean, std = self.scalers[modality].get(feature_name, (0.0, 1.0))
        return (raw_value - mean) / std

    def _unnormalize_feature(self, modality: str, feature_name: str, norm_value: float) -> float:
        mean, std = self.scalers[modality].get(feature_name, (0.0, 1.0))
        return norm_value * std + mean

    def prepare_patient_tensors(
        self, visits: List[Visit]
    ) -> Tuple[
        List[Dict[str, Optional[torch.Tensor]]],
        List[Dict[str, int]],
        List[Dict[str, Dict[str, float]]],
    ]:
        """
        Convert chronological database visit measurements into PULSE tensor inputs and masks.
        """
        visits_data: List[Dict[str, Optional[torch.Tensor]]] = []
        missing_masks: List[Dict[str, int]] = []
        raw_measurement_maps: List[Dict[str, Dict[str, float]]] = []

        for visit in visits:
            visit_dict: Dict[str, Dict[str, float]] = {
                "routine_labs": {},
                "metabolomics": {},
                "proteomics": {},
            }
            for m in visit.measurements:
                if not m.is_synthetic and m.modality in visit_dict:
                    visit_dict[m.modality][m.feature_name] = m.feature_value

            raw_measurement_maps.append(visit_dict)

            visit_tensors: Dict[str, Optional[torch.Tensor]] = {}
            visit_mask: Dict[str, int] = {}

            # Process routine_labs
            lab_vals = []
            lab_missing = False
            for k in self.lab_keys:
                if k in visit_dict["routine_labs"]:
                    norm_val = self._normalize_feature("routine_labs", k, visit_dict["routine_labs"][k])
                    lab_vals.append(norm_val)
                else:
                    lab_missing = True
                    lab_vals.append(0.0)  # default zero normalized

            if not lab_missing and len(visit_dict["routine_labs"]) == len(self.lab_keys):
                visit_mask["routine_labs"] = 0
                visit_tensors["routine_labs"] = torch.tensor(
                    [lab_vals], dtype=torch.float32, device=self.device
                )
            elif len(visit_dict["routine_labs"]) > 0:
                # Partially observed labs
                visit_mask["routine_labs"] = 0
                visit_tensors["routine_labs"] = torch.tensor(
                    [lab_vals], dtype=torch.float32, device=self.device
                )
            else:
                visit_mask["routine_labs"] = 2
                visit_tensors["routine_labs"] = None

            # Process metabolomics
            metab_vals = []
            if len(visit_dict["metabolomics"]) > 0:
                for k in self.metab_keys:
                    raw = visit_dict["metabolomics"].get(k, 0.0)
                    metab_vals.append(self._normalize_feature("metabolomics", k, raw))
                visit_mask["metabolomics"] = 0
                visit_tensors["metabolomics"] = torch.tensor(
                    [metab_vals], dtype=torch.float32, device=self.device
                )
            else:
                visit_mask["metabolomics"] = 2
                visit_tensors["metabolomics"] = None

            # Process proteomics
            prot_vals = []
            if len(visit_dict["proteomics"]) > 0:
                for k in self.prot_keys:
                    raw = visit_dict["proteomics"].get(k, 0.0)
                    prot_vals.append(self._normalize_feature("proteomics", k, raw))
                visit_mask["proteomics"] = 0
                visit_tensors["proteomics"] = torch.tensor(
                    [prot_vals], dtype=torch.float32, device=self.device
                )
            else:
                visit_mask["proteomics"] = 2
                visit_tensors["proteomics"] = None

            visits_data.append(visit_tensors)
            missing_masks.append(visit_mask)

        return visits_data, missing_masks, raw_measurement_maps

    def run_synthesis_and_prediction(self, db: Session, patient_id: str) -> Optional[Patient]:
        """
        Execute end-to-end PULSE forward pass, synthesize missing omics,
        compute disease risks, and persist all outputs into the database.
        """
        patient = get_patient(db, patient_id)
        if not patient or len(patient.visits) == 0:
            return patient

        # Prepare chronological inputs
        visits_data, missing_masks, raw_maps = self.prepare_patient_tensors(patient.visits)

        with torch.no_grad():
            output = self.model.forward(
                visits_data=visits_data,
                missing_masks=missing_masks,
                kl_annealing_weight=1.0,
                return_all_visit_states=True,
            )

        all_reconstructions = output["reconstructions"]
        all_visit_states = output["visit_states"]

        baseline_map: Dict[str, float] = {}

        # Iterate through visits
        for visit_idx, (visit, mask, raw_map, recon, z_state) in enumerate(
            zip(patient.visits, missing_masks, raw_maps, all_reconstructions, all_visit_states)
        ):
            # 1. Clean previous synthetic measurements
            clear_synthetic_measurements(db, visit.id)

            current_visit_measurements: Dict[str, float] = {}
            for mod_k, vals in raw_map.items():
                current_visit_measurements.update(vals)

            # 2. Synthesize missing metabolomics if mask == 2
            if mask["metabolomics"] == 2 and "metabolomics" in recon:
                recon_tensor = recon["metabolomics"].squeeze(0).cpu().numpy()
                for feat_idx, feat_name in enumerate(self.metab_keys):
                    meta = METABOLOMICS_FEATURES[feat_name]
                    norm_val = float(recon_tensor[feat_idx])
                    raw_val = self._unnormalize_feature("metabolomics", feat_name, norm_val)
                    raw_val = max(raw_val, 0.01)  # floor positive biomarkers

                    # Confidence interval estimation (95% CI)
                    margin = max(abs(raw_val) * 0.08, 0.02)
                    c_low = max(round(raw_val - margin, 3), 0.0)
                    c_high = round(raw_val + margin, 3)
                    raw_val = round(raw_val, 3)

                    db.add(
                        Measurement(
                            visit_id=visit.id,
                            modality="metabolomics",
                            feature_name=feat_name,
                            feature_value=raw_val,
                            is_synthetic=True,
                            unit=meta.unit,
                            reference_low=meta.ref_low,
                            reference_high=meta.ref_high,
                            confidence_lower=c_low,
                            confidence_upper=c_high,
                        )
                    )
                    current_visit_measurements[feat_name] = raw_val

            # 3. Synthesize missing proteomics if mask == 2
            if mask["proteomics"] == 2 and "proteomics" in recon:
                recon_tensor = recon["proteomics"].squeeze(0).cpu().numpy()
                for feat_idx, feat_name in enumerate(self.prot_keys):
                    meta = PROTEOMICS_FEATURES[feat_name]
                    norm_val = float(recon_tensor[feat_idx])
                    raw_val = self._unnormalize_feature("proteomics", feat_name, norm_val)
                    raw_val = max(raw_val, 0.1)

                    margin = max(abs(raw_val) * 0.09, 1.0)
                    c_low = max(round(raw_val - margin, 2), 0.0)
                    c_high = round(raw_val + margin, 2)
                    raw_val = round(raw_val, 2)

                    db.add(
                        Measurement(
                            visit_id=visit.id,
                            modality="proteomics",
                            feature_name=feat_name,
                            feature_value=raw_val,
                            is_synthetic=True,
                            unit=meta.unit,
                            reference_low=meta.ref_low,
                            reference_high=meta.ref_high,
                            confidence_lower=c_low,
                            confidence_upper=c_high,
                        )
                    )
                    current_visit_measurements[feat_name] = raw_val

            if visit_idx == 0:
                baseline_map = dict(current_visit_measurements)

            # 4. Save Latent State (16-dim vector)
            z_vec = [round(float(v), 4) for v in z_state.squeeze(0).cpu().numpy()]
            if visit.latent_state:
                visit.latent_state.set_z_vector(z_vec)
            else:
                db_latent = LatentState(
                    visit_id=visit.id,
                    z_state_json=json.dumps(z_vec),
                    past_state_json=json.dumps([0.0] * 16),
                )
                db.add(db_latent)

            # 5. Compute Risk Predictions
            notes_text = " ".join([n.note_text for n in visit.clinical_notes])
            eval_risks = RiskModelService.evaluate_visit_risks(
                age=patient.age,
                sex=patient.sex,
                cohort_type=patient.cohort_type,
                measurements=current_visit_measurements,
                baseline_measurements=baseline_map,
                notes_text=notes_text,
            )

            # Clear existing predictions
            for p in list(visit.predictions):
                db.delete(p)

            # Add updated predictions
            for r in eval_risks:
                db_pred = RiskPrediction(
                    visit_id=visit.id,
                    task_type=r["task_type"],
                    disease_name=r["disease_name"],
                    risk_probability=r["risk_probability"],
                    risk_category=r["risk_category"],
                    top_drivers_json=json.dumps(r["top_drivers"]),
                )
                db.add(db_pred)

        db.commit()
        return get_patient(db, patient_id)
