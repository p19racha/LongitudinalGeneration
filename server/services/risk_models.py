"""
Clinical risk prediction heads and explainable AI (XAI) feature attribution.
"""
from typing import Any, Dict, List, Tuple
import math
from server.db.models import CohortType, RiskCategory, TaskType


def sigmoid(x: float) -> float:
    return 1.0 / (1.0 + math.exp(-max(min(x, 20.0), -20.0)))


def categorize_risk(prob: float, task_type: TaskType) -> RiskCategory:
    """Categorize probability into clinical risk tiers."""
    if task_type == TaskType.CHRONIC_10Y_RISK:
        if prob < 0.15:
            return RiskCategory.LOW
        elif prob < 0.25:
            return RiskCategory.MODERATE
        elif prob < 0.35:
            return RiskCategory.HIGH
        else:
            return RiskCategory.CRITICAL
    else:  # ICU tasks
        if prob < 0.12:
            return RiskCategory.LOW
        elif prob < 0.22:
            return RiskCategory.MODERATE
        elif prob < 0.32:
            return RiskCategory.HIGH
        else:
            return RiskCategory.CRITICAL


class RiskModelService:
    """
    Computes disease probabilities and top explanatory factors from patient features.
    """

    @classmethod
    def evaluate_visit_risks(
        cls,
        age: float,
        sex: str,
        cohort_type: CohortType,
        measurements: Dict[str, float],
        baseline_measurements: Dict[str, float] = None,
        notes_text: str = "",
    ) -> List[Dict[str, Any]]:
        """
        Evaluate all applicable risk targets for a clinical encounter.
        Returns list of risk assessment dictionaries.
        """
        baseline_measurements = baseline_measurements or {}
        results: List[Dict[str, Any]] = []

        if cohort_type == CohortType.OUTPATIENT_CHRONIC:
            results.append(cls._calc_mi_risk(age, sex, measurements, baseline_measurements))
            results.append(cls._calc_hf_risk(age, sex, measurements, baseline_measurements))
            results.append(cls._calc_dementia_risk(age, sex, measurements, baseline_measurements))
            results.append(cls._calc_diabetes_risk(age, sex, measurements, baseline_measurements))
            results.append(cls._calc_stroke_risk(age, sex, measurements, baseline_measurements))
        else:  # Inpatient ICU
            results.append(cls._calc_icu_readmission(age, sex, measurements, baseline_measurements, notes_text))
            results.append(cls._calc_icu_mortality(age, sex, measurements, baseline_measurements))

        return results

    @classmethod
    def _calc_mi_risk(
        cls,
        age: float,
        sex: str,
        m: Dict[str, float],
        base_m: Dict[str, float],
    ) -> Dict[str, Any]:
        """10-year Myocardial Infarction risk."""
        base_logit = -2.8 + (age - 60.0) * 0.045
        if sex.upper().startswith("M"):
            base_logit += 0.25

        drivers = []

        # LDL & Synthesized Large LDL Free Cholesterol
        ldl = m.get("LDL_Cholesterol", 100.0)
        ldl_ratio = m.get("Free_Cholesterol_to_Total_Lipid_large_LDL", 0.26)
        base_ldl_ratio = base_m.get("Free_Cholesterol_to_Total_Lipid_large_LDL", ldl_ratio)

        ratio_delta = (ldl_ratio - base_ldl_ratio) / (base_ldl_ratio + 1e-6)

        ldl_contrib = ((ldl - 100.0) / 40.0) * 0.4
        ratio_contrib = ((ldl_ratio - 0.26) / 0.06) * 0.65
        base_logit += ldl_contrib + ratio_contrib

        if ldl_ratio > 0.30:
            drivers.append({
                "feature_name": "Free_Cholesterol_to_Total_Lipid_large_LDL",
                "impact_score": round(ratio_contrib, 3),
                "description": f"Elevated LDL cholesterol subfraction ratio ({ldl_ratio:.2f}) with +{ratio_delta*100:.1f}% shift from baseline.",
            })

        hscrp = m.get("hsCRP", 1.5)
        if hscrp > 2.0:
            crp_contrib = ((hscrp - 2.0) / 2.0) * 0.35
            base_logit += crp_contrib
            drivers.append({
                "feature_name": "hsCRP",
                "impact_score": round(crp_contrib, 3),
                "description": f"Systemic vascular inflammation (hsCRP {hscrp:.1f} mg/L).",
            })

        prob = round(sigmoid(base_logit), 3)
        return {
            "task_type": TaskType.CHRONIC_10Y_RISK,
            "disease_name": "myocardial_infarction",
            "risk_probability": prob,
            "risk_category": categorize_risk(prob, TaskType.CHRONIC_10Y_RISK),
            "top_drivers": sorted(drivers, key=lambda d: abs(d["impact_score"]), reverse=True)[:3],
        }

    @classmethod
    def _calc_hf_risk(
        cls,
        age: float,
        sex: str,
        m: Dict[str, float],
        base_m: Dict[str, float],
    ) -> Dict[str, Any]:
        """10-year Heart Failure risk."""
        base_logit = -3.1 + (age - 60.0) * 0.05
        drivers = []

        vldl_tg = m.get("small_VLDL_TG_pct", 0.30)
        vldl_contrib = ((vldl_tg - 0.30) / 0.10) * 0.55
        base_logit += vldl_contrib

        if vldl_tg > 0.38:
            drivers.append({
                "feature_name": "small_VLDL_TG_pct",
                "impact_score": round(vldl_contrib, 3),
                "description": f"Expanded triglyceride-rich remnant VLDL fraction ({vldl_tg*100:.1f}%).",
            })

        nt_probnp = m.get("NT_proBNP", 80.0)
        if nt_probnp > 125.0:
            bnp_contrib = ((nt_probnp - 125.0) / 100.0) * 0.6
            base_logit += bnp_contrib
            drivers.append({
                "feature_name": "NT_proBNP",
                "impact_score": round(bnp_contrib, 3),
                "description": f"Ventricular hemodynamic stress (NT-proBNP {nt_probnp:.1f} pg/mL).",
            })

        prob = round(sigmoid(base_logit), 3)
        return {
            "task_type": TaskType.CHRONIC_10Y_RISK,
            "disease_name": "heart_failure",
            "risk_probability": prob,
            "risk_category": categorize_risk(prob, TaskType.CHRONIC_10Y_RISK),
            "top_drivers": sorted(drivers, key=lambda d: abs(d["impact_score"]), reverse=True)[:3],
        }

    @classmethod
    def _calc_dementia_risk(
        cls,
        age: float,
        sex: str,
        m: Dict[str, float],
        base_m: Dict[str, float],
    ) -> Dict[str, Any]:
        """10-year Dementia / Alzheimer's progression risk."""
        base_logit = -3.4 + (age - 65.0) * 0.065
        drivers = []

        gfap = m.get("GFAP", 80.0)
        base_gfap = base_m.get("GFAP", gfap)
        gfap_delta = (gfap - base_gfap) / (base_gfap + 1e-6)

        if gfap > 110.0:
            gfap_contrib = ((gfap - 100.0) / 40.0) * 0.7
            base_logit += gfap_contrib
            drivers.append({
                "feature_name": "GFAP",
                "impact_score": round(gfap_contrib, 3),
                "description": f"Elevated astrocytic activation marker GFAP ({gfap:.1f} pg/mL, +{gfap_delta*100:.1f}% vs baseline).",
            })

        nfl = m.get("NEFL_NfL", 14.0)
        if nfl > 18.0:
            nfl_contrib = ((nfl - 18.0) / 8.0) * 0.55
            base_logit += nfl_contrib
            drivers.append({
                "feature_name": "NEFL_NfL",
                "impact_score": round(nfl_contrib, 3),
                "description": f"Neuroaxonal breakdown marker NfL ({nfl:.1f} pg/mL).",
            })

        hcy = m.get("Homocysteine", 10.0)
        if hcy > 14.0:
            hcy_contrib = ((hcy - 14.0) / 6.0) * 0.4
            base_logit += hcy_contrib
            drivers.append({
                "feature_name": "Homocysteine",
                "impact_score": round(hcy_contrib, 3),
                "description": f"Elevated neurovascular homocysteine ({hcy:.1f} umol/L).",
            })

        prob = round(sigmoid(base_logit), 3)
        return {
            "task_type": TaskType.CHRONIC_10Y_RISK,
            "disease_name": "dementia",
            "risk_probability": prob,
            "risk_category": categorize_risk(prob, TaskType.CHRONIC_10Y_RISK),
            "top_drivers": sorted(drivers, key=lambda d: abs(d["impact_score"]), reverse=True)[:3],
        }

    @classmethod
    def _calc_diabetes_risk(
        cls,
        age: float,
        sex: str,
        m: Dict[str, float],
        base_m: Dict[str, float],
    ) -> Dict[str, Any]:
        """10-year Type 2 Diabetes onset or progression."""
        base_logit = -2.6 + (age - 55.0) * 0.03
        drivers = []

        hba1c = m.get("HbA1c", 5.4)
        if hba1c >= 5.7:
            a1c_contrib = ((hba1c - 5.6) / 0.8) * 0.85
            base_logit += a1c_contrib
            drivers.append({
                "feature_name": "HbA1c",
                "impact_score": round(a1c_contrib, 3),
                "description": f"Glycated hemoglobin ({hba1c:.1f}%) in pre-diabetic/diabetic range.",
            })

        glucose = m.get("Glucose_Fasting", 90.0)
        if glucose > 100.0:
            glu_contrib = ((glucose - 100.0) / 25.0) * 0.5
            base_logit += glu_contrib
            drivers.append({
                "feature_name": "Glucose_Fasting",
                "impact_score": round(glu_contrib, 3),
                "description": f"Impaired fasting blood glucose ({glucose:.0f} mg/dL).",
            })

        prob = round(sigmoid(base_logit), 3)
        return {
            "task_type": TaskType.CHRONIC_10Y_RISK,
            "disease_name": "diabetes",
            "risk_probability": prob,
            "risk_category": categorize_risk(prob, TaskType.CHRONIC_10Y_RISK),
            "top_drivers": sorted(drivers, key=lambda d: abs(d["impact_score"]), reverse=True)[:3],
        }

    @classmethod
    def _calc_stroke_risk(
        cls,
        age: float,
        sex: str,
        m: Dict[str, float],
        base_m: Dict[str, float],
    ) -> Dict[str, Any]:
        """10-year Ischemic Stroke risk."""
        base_logit = -3.2 + (age - 60.0) * 0.055
        drivers = []

        hcy = m.get("Homocysteine", 10.0)
        if hcy > 13.0:
            hcy_contrib = ((hcy - 13.0) / 7.0) * 0.45
            base_logit += hcy_contrib
            drivers.append({
                "feature_name": "Homocysteine",
                "impact_score": round(hcy_contrib, 3),
                "description": f"Thrombogenic amino acid elevation ({hcy:.1f} umol/L).",
            })

        hscrp = m.get("hsCRP", 1.5)
        if hscrp > 2.5:
            crp_contrib = ((hscrp - 2.5) / 2.0) * 0.35
            base_logit += crp_contrib
            drivers.append({
                "feature_name": "hsCRP",
                "impact_score": round(crp_contrib, 3),
                "description": f"Atherothrombotic vascular inflammation ({hscrp:.1f} mg/L).",
            })

        prob = round(sigmoid(base_logit), 3)
        return {
            "task_type": TaskType.CHRONIC_10Y_RISK,
            "disease_name": "stroke",
            "risk_probability": prob,
            "risk_category": categorize_risk(prob, TaskType.CHRONIC_10Y_RISK),
            "top_drivers": sorted(drivers, key=lambda d: abs(d["impact_score"]), reverse=True)[:3],
        }

    @classmethod
    def _calc_icu_readmission(
        cls,
        age: float,
        sex: str,
        m: Dict[str, float],
        base_m: Dict[str, float],
        notes_text: str,
    ) -> Dict[str, Any]:
        """30-day post-discharge ICU readmission risk."""
        base_logit = -1.8 + (age - 55.0) * 0.02
        drivers = []

        lactate = m.get("Lactate", 1.2)
        if lactate > 2.0:
            lac_contrib = ((lactate - 2.0) / 2.0) * 0.65
            base_logit += lac_contrib
            drivers.append({
                "feature_name": "Lactate",
                "impact_score": round(lac_contrib, 3),
                "description": f"Persistent lactic acidemia ({lactate:.1f} mmol/L) reflecting hypoperfusion.",
            })

        creat = m.get("Creatinine", 1.0)
        if creat > 1.5:
            cr_contrib = ((creat - 1.5) / 1.0) * 0.45
            base_logit += cr_contrib
            drivers.append({
                "feature_name": "Creatinine",
                "impact_score": round(cr_contrib, 3),
                "description": f"Renal impairment / AKI signal (Creatinine {creat:.1f} mg/dL).",
            })

        prob = round(sigmoid(base_logit), 3)
        return {
            "task_type": TaskType.ICU_30D_READMISSION,
            "disease_name": "icu_readmission",
            "risk_probability": prob,
            "risk_category": categorize_risk(prob, TaskType.ICU_30D_READMISSION),
            "top_drivers": sorted(drivers, key=lambda d: abs(d["impact_score"]), reverse=True)[:3],
        }

    @classmethod
    def _calc_icu_mortality(
        cls,
        age: float,
        sex: str,
        m: Dict[str, float],
        base_m: Dict[str, float],
    ) -> Dict[str, Any]:
        """30-day ICU mortality risk."""
        base_logit = -2.5 + (age - 55.0) * 0.035
        drivers = []

        lactate = m.get("Lactate", 1.2)
        if lactate > 2.5:
            lac_contrib = ((lactate - 2.5) / 2.0) * 0.8
            base_logit += lac_contrib
            drivers.append({
                "feature_name": "Lactate",
                "impact_score": round(lac_contrib, 3),
                "description": f"Severe shock state marker ({lactate:.1f} mmol/L).",
            })

        pao2_fio2 = m.get("PaO2_FiO2", 350.0)
        if pao2_fio2 < 250.0:
            resp_contrib = ((250.0 - pao2_fio2) / 100.0) * 0.6
            base_logit += resp_contrib
            drivers.append({
                "feature_name": "PaO2_FiO2",
                "impact_score": round(resp_contrib, 3),
                "description": f"Acute respiratory hypoxia / ARDS criteria ({pao2_fio2:.0f} mmHg).",
            })

        prob = round(sigmoid(base_logit), 3)
        return {
            "task_type": TaskType.ICU_30D_MORTALITY,
            "disease_name": "icu_mortality",
            "risk_probability": prob,
            "risk_category": categorize_risk(prob, TaskType.ICU_30D_MORTALITY),
            "top_drivers": sorted(drivers, key=lambda d: abs(d["impact_score"]), reverse=True)[:3],
        }
