"""
Automated unit and integration tests for Phase 2: PULSE Engine Service & Adaptation Layer.
"""
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from server.db.base import Base
from server.db.models import (
    CohortType,
    Patient,
    Visit,
    Measurement,
    TaskType,
    RiskCategory,
)
from server.demo_data.seed_data import seed_database
from server.services.pulse_engine import PulseInferenceService
from server.services.feature_definitions import (
    ROUTINE_LAB_FEATURES,
    METABOLOMICS_FEATURES,
    PROTEOMICS_FEATURES,
    get_feature_meta,
)
from server.services.risk_models import RiskModelService


@pytest.fixture
def db_session():
    """In-memory SQLite database populated with demo cohorts."""
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()
    seed_database(session)
    try:
        yield session
    finally:
        session.close()


def test_feature_definitions():
    """Verify standard clinical feature metadata and normal reference ranges."""
    assert len(ROUTINE_LAB_FEATURES) == 19
    assert len(METABOLOMICS_FEATURES) == 8
    assert len(PROTEOMICS_FEATURES) == 6

    glucose_meta = get_feature_meta("Glucose_Fasting")
    assert glucose_meta is not None
    assert glucose_meta.unit == "mg/dL"
    assert glucose_meta.ref_low == 70.0
    assert glucose_meta.ref_high == 99.0

    gfap_meta = get_feature_meta("GFAP")
    assert gfap_meta is not None
    assert gfap_meta.modality == "proteomics"


def test_pulse_inference_service_initialization():
    """Verify singleton initialization, modality dimensions, and scalers."""
    service = PulseInferenceService.get_instance()
    assert service is not None
    assert service.modality_dims["routine_labs"] == 19
    assert service.modality_dims["metabolomics"] == 8
    assert service.modality_dims["proteomics"] == 6

    # Test normalization & unnormalization cycle
    norm_val = service._normalize_feature("routine_labs", "Glucose_Fasting", 100.0)
    unnorm_val = service._unnormalize_feature("routine_labs", "Glucose_Fasting", norm_val)
    assert abs(unnorm_val - 100.0) < 1e-4


def test_tensor_preparation_and_masking(db_session):
    """Verify that database visits are converted into tensors with accurate missing masks."""
    service = PulseInferenceService.get_instance()
    arthur = db_session.query(Patient).filter_by(mrn="MRN-CV-10029").first()
    assert arthur is not None

    visits_data, missing_masks, raw_maps = service.prepare_patient_tensors(arthur.visits)
    assert len(visits_data) == 3
    assert len(missing_masks) == 3

    # Visit 0 has paired labs and baseline metabolomics
    assert missing_masks[0]["routine_labs"] == 0
    assert visits_data[0]["routine_labs"].shape == (1, 19)

    # Visit 1 has labs but missing metabolomics in raw data
    assert missing_masks[1]["routine_labs"] == 0
    assert missing_masks[1]["metabolomics"] == 2
    assert visits_data[1]["metabolomics"] is None


def test_end_to_end_synthesis_and_prediction_outpatient(db_session):
    """Test full forward pass, missing omics synthesis, and risk prediction on outpatient cohort."""
    service = PulseInferenceService.get_instance()
    arthur = db_session.query(Patient).filter_by(mrn="MRN-CV-10029").first()
    assert arthur is not None

    # Run synthesis
    updated_patient = service.run_synthesis_and_prediction(db_session, arthur.id)
    assert updated_patient is not None

    # Check that Visit 1 and Visit 2 now have synthesized metabolomics
    v1 = updated_patient.visits[1]
    synthetic_metab = [m for m in v1.measurements if m.is_synthetic and m.modality == "metabolomics"]
    assert len(synthetic_metab) == len(METABOLOMICS_FEATURES)

    # Verify confidence intervals on synthesized features
    for sm in synthetic_metab:
        assert sm.confidence_lower is not None
        assert sm.confidence_upper is not None
        assert sm.confidence_lower <= sm.feature_value <= sm.confidence_upper

    # Check 16-dimensional latent state
    assert v1.latent_state is not None
    z_vec = v1.latent_state.get_z_vector()
    assert len(z_vec) == 16

    # Check chronic risk predictions
    predictions = v1.predictions
    assert len(predictions) >= 4
    mi_pred = next(p for p in predictions if p.disease_name == "myocardial_infarction")
    assert 0.0 <= mi_pred.risk_probability <= 1.0
    drivers = mi_pred.get_top_drivers()
    assert len(drivers) > 0


def test_end_to_end_synthesis_icu(db_session):
    """Test ICU acute care trajectory evaluation and 30-day readmission prediction."""
    service = PulseInferenceService.get_instance()
    david = db_session.query(Patient).filter_by(mrn="MRN-ICU-88304").first()
    assert david is not None

    updated_patient = service.run_synthesis_and_prediction(db_session, david.id)
    assert updated_patient is not None

    v0 = updated_patient.visits[0]
    preds = v0.predictions
    readmit_pred = next(p for p in preds if p.disease_name == "icu_readmission")
    mort_pred = next(p for p in preds if p.disease_name == "icu_mortality")

    assert readmit_pred.risk_category in (RiskCategory.HIGH, RiskCategory.MODERATE)
    assert mort_pred.risk_category in (RiskCategory.HIGH, RiskCategory.MODERATE)
