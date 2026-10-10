"""
Automated unit and integration tests for Phase 1: Core Database & Data Access Layer.
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
    ClinicalNote,
    LatentState,
    RiskPrediction,
    TaskType,
    RiskCategory,
)
from server.crud.patient import (
    create_patient,
    get_patient,
    get_patient_by_mrn,
    list_patients,
    update_patient,
    delete_patient,
)
from server.crud.visit import create_visit, get_visit, list_visits_by_patient
from server.crud.measurement import (
    create_measurements_batch,
    get_measurements_by_visit,
    clear_synthetic_measurements,
)
from server.schemas.patient import PatientCreate, PatientUpdate
from server.schemas.visit import VisitCreate
from server.schemas.measurement import MeasurementCreate
from server.demo_data.seed_data import seed_database


@pytest.fixture
def db_session():
    """In-memory SQLite database fixture for fast, isolated test execution."""
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


def test_schema_creation_and_seeding(db_session):
    """Verify that tables are created and seed data is correctly populated."""
    seeded = seed_database(db_session)
    assert len(seeded) == 3

    # Check Arthur Pendelton
    arthur = get_patient_by_mrn(db_session, "MRN-CV-10029")
    assert arthur is not None
    assert arthur.full_name == "Arthur Pendelton"
    assert arthur.cohort_type == CohortType.OUTPATIENT_CHRONIC
    assert len(arthur.visits) == 3

    # Check chronological ordering
    indices = [v.visit_index for v in arthur.visits]
    assert indices == [0, 1, 2]

    # Check measured vs synthetic in visit 1
    v1_measurements = arthur.visits[1].measurements
    measured = [m for m in v1_measurements if not m.is_synthetic]
    synthetic = [m for m in v1_measurements if m.is_synthetic]
    assert len(measured) > 0
    assert len(synthetic) > 0

    # Check latent state vector length 16
    v0_state = arthur.visits[0].latent_state
    assert v0_state is not None
    z_vec = v0_state.get_z_vector()
    assert len(z_vec) == 16


def test_icu_patient_clinical_notes_and_predictions(db_session):
    """Verify ICU cohort features including 4-hour clinical text and acute risks."""
    seed_database(db_session)
    david = get_patient_by_mrn(db_session, "MRN-ICU-88304")
    assert david is not None
    assert david.cohort_type == CohortType.INPATIENT_ICU
    assert len(david.visits) == 3

    # Check admission visit notes
    v0 = david.visits[0]
    assert len(v0.clinical_notes) == 1
    assert "Septic shock" in v0.clinical_notes[0].note_text or "ED with fever" in v0.clinical_notes[0].note_text

    # Check risk predictions
    preds = v0.predictions
    assert len(preds) == 2
    readmission_pred = next(p for p in preds if p.task_type == TaskType.ICU_30D_READMISSION)
    assert 0.0 <= readmission_pred.risk_probability <= 1.0
    assert readmission_pred.risk_category in (RiskCategory.HIGH, RiskCategory.MODERATE)

    drivers = readmission_pred.get_top_drivers()
    assert len(drivers) > 0
    assert "Lactate" in drivers[0]["feature_name"]


def test_patient_crud_operations(db_session):
    """Test full CRUD lifecycle for patient records."""
    # Create
    p_in = PatientCreate(
        mrn="MRN-TEST-9999",
        full_name="Sarah Connor",
        age=45.0,
        sex="F",
        cohort_type=CohortType.OUTPATIENT_CHRONIC,
        clinical_history_summary="Healthy baseline patient test record",
    )
    patient = create_patient(db_session, p_in)
    assert patient.id is not None
    assert patient.mrn == "MRN-TEST-9999"

    # Read
    fetched = get_patient(db_session, patient.id)
    assert fetched is not None
    assert fetched.full_name == "Sarah Connor"

    # List & Search
    items, total = list_patients(db_session, search_query="Sarah")
    assert total == 1
    assert items[0].full_name == "Sarah Connor"

    # Update
    update_in = PatientUpdate(full_name="Sarah J. Connor", age=46.0)
    updated = update_patient(db_session, fetched, update_in)
    assert updated.full_name == "Sarah J. Connor"
    assert updated.age == 46.0

    # Delete
    deleted = delete_patient(db_session, patient.id)
    assert deleted is True
    assert get_patient(db_session, patient.id) is None


def test_visit_and_measurement_cascade(db_session):
    """Test visit creation with batch measurements and cascade deletion."""
    p_in = PatientCreate(
        mrn="MRN-TEST-8888",
        full_name="John Doe",
        age=50.0,
        sex="M",
    )
    patient = create_patient(db_session, p_in)

    v_in = VisitCreate(
        visit_index=0,
        visit_date="2024-01-01",
        hours_from_baseline=0.0,
        visit_summary="Baseline Consultation",
        measurements=[
            MeasurementCreate(
                modality="routine_labs",
                feature_name="Glucose",
                feature_value=95.0,
                unit="mg/dL",
            ),
            MeasurementCreate(
                modality="routine_labs",
                feature_name="HbA1c",
                feature_value=5.4,
                unit="%",
            ),
        ],
    )
    visit = create_visit(db_session, patient.id, v_in)
    assert visit is not None
    assert len(visit.measurements) == 2

    # Add batch measurements
    new_measurements = [
        MeasurementCreate(
            modality="metabolomics",
            feature_name="LDL_ratio",
            feature_value=0.25,
            is_synthetic=True,
        )
    ]
    added = create_measurements_batch(db_session, visit.id, new_measurements)
    assert len(added) == 1

    # Clear synthetic measurements
    cleared_count = clear_synthetic_measurements(db_session, visit.id)
    assert cleared_count == 1

    remaining = get_measurements_by_visit(db_session, visit.id)
    assert len(remaining) == 2
    assert all(not m.is_synthetic for m in remaining)

    # Cascade delete patient
    assert delete_patient(db_session, patient.id) is True
    # Verify measurements were also deleted
    orphaned = get_measurements_by_visit(db_session, visit.id)
    assert len(orphaned) == 0
