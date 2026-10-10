"""
Integration tests for Phase 3: REST API Backend (FastAPI).
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from server.db.base import Base
from server.db.session import get_db
from server.main import app
from server.demo_data.seed_data import seed_database


@pytest.fixture
def client_with_db():
    """TestClient wired to an isolated in-memory SQLite database populated with demo cohorts."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        echo=False,
    )
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    # Seed data
    with TestingSessionLocal() as session:
        seed_database(session)

    def override_get_db():
        session = TestingSessionLocal()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as client:
        yield client

    app.dependency_overrides.clear()


def test_health_check(client_with_db):
    """Test server health endpoint."""
    response = client_with_db.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"


def test_features_catalog(client_with_db):
    """Test feature catalog endpoint."""
    response = client_with_db.get("/api/features")
    assert response.status_code == 200
    data = response.json()
    assert len(data["routine_labs"]) == 19
    assert len(data["metabolomics"]) == 8
    assert len(data["proteomics"]) == 6
    assert data["total_count"] == 33


def test_list_patients(client_with_db):
    """Test paginated patient listing and search filter."""
    response = client_with_db.get("/api/patients")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 3
    assert len(data["items"]) == 3

    # Filter by cohort
    icu_res = client_with_db.get("/api/patients?cohort_type=INPATIENT_ICU")
    assert icu_res.status_code == 200
    icu_data = icu_res.json()
    assert icu_data["total"] == 1
    assert icu_data["items"][0]["full_name"] == "David Miller"

    # Search by name
    search_res = client_with_db.get("/api/patients?search=Arthur")
    assert search_res.status_code == 200
    search_data = search_res.json()
    assert search_data["total"] == 1
    assert search_data["items"][0]["mrn"] == "MRN-CV-10029"


def test_patient_crud_endpoints(client_with_db):
    """Test patient creation, retrieval, update, and deletion."""
    # Create
    new_patient_payload = {
        "mrn": "MRN-API-TEST-001",
        "full_name": "Marcus Aurelius",
        "age": 58.0,
        "sex": "M",
        "cohort_type": "OUTPATIENT_CHRONIC",
        "clinical_history_summary": "Test patient profile created via REST API",
    }
    create_res = client_with_db.post("/api/patients", json=new_patient_payload)
    assert create_res.status_code == 201
    created_data = create_res.json()
    patient_id = created_data["id"]
    assert created_data["mrn"] == "MRN-API-TEST-001"

    # Get by ID
    get_res = client_with_db.get(f"/api/patients/{patient_id}")
    assert get_res.status_code == 200
    assert get_res.json()["full_name"] == "Marcus Aurelius"

    # Update
    update_res = client_with_db.put(
        f"/api/patients/{patient_id}", json={"full_name": "Marcus Aurelius (Updated)"}
    )
    assert update_res.status_code == 200
    assert update_res.json()["full_name"] == "Marcus Aurelius (Updated)"

    # Delete
    del_res = client_with_db.delete(f"/api/patients/{patient_id}")
    assert del_res.status_code == 204

    # Verify not found
    get_again = client_with_db.get(f"/api/patients/{patient_id}")
    assert get_again.status_code == 404


def test_add_visit_and_measurements(client_with_db):
    """Test adding a clinical visit and batch lab measurements."""
    # Fetch first patient
    p_res = client_with_db.get("/api/patients")
    patient_id = p_res.json()["items"][0]["id"]

    visit_payload = {
        "visit_index": 3,
        "visit_date": "2026-03-01",
        "hours_from_baseline": 26280.0,
        "visit_summary": "Year 3 Routine Follow-Up",
        "measurements": [
            {
                "modality": "routine_labs",
                "feature_name": "Glucose_Fasting",
                "feature_value": 130.0,
                "unit": "mg/dL",
            },
            {
                "modality": "routine_labs",
                "feature_name": "HbA1c",
                "feature_value": 7.0,
                "unit": "%",
            },
        ],
    }
    visit_res = client_with_db.post(f"/api/patients/{patient_id}/visits", json=visit_payload)
    assert visit_res.status_code == 201
    visit_data = visit_res.json()
    visit_id = visit_data["id"]
    assert len(visit_data["measurements"]) == 2

    # Add clinical note
    note_payload = {
        "step_hour": 0.0,
        "note_type": "PHYSICIAN",
        "note_text": "Patient reports adherence to diet and exercise.",
    }
    note_res = client_with_db.post(f"/api/visits/{visit_id}/notes", json=note_payload)
    assert note_res.status_code == 201
    assert note_res.json()["note_type"] == "PHYSICIAN"


def test_run_pulse_endpoint(client_with_db):
    """Test on-demand PULSE execution endpoint."""
    p_res = client_with_db.get("/api/patients?search=Arthur")
    patient_id = p_res.json()["items"][0]["id"]

    run_res = client_with_db.post(f"/api/patients/{patient_id}/run-pulse")
    assert run_res.status_code == 200
    data = run_res.json()
    assert data["message"] == "PULSE synthesis and risk assessment successfully executed."
    assert data["synthesized_measurements_count"] > 0
    assert data["predictions_count"] > 0

    # Verify updated patient
    patient = data["patient"]
    v1 = patient["visits"][1]
    synthetic_metab = [m for m in v1["measurements"] if m["is_synthetic"]]
    assert len(synthetic_metab) > 0


def test_trajectories_and_report_endpoints(client_with_db):
    """Test trajectory trend curves and clinical report generation."""
    p_res = client_with_db.get("/api/patients?search=Arthur")
    patient_id = p_res.json()["items"][0]["id"]

    # Trajectories
    traj_res = client_with_db.get(f"/api/patients/{patient_id}/trajectories")
    assert traj_res.status_code == 200
    traj_data = traj_res.json()
    assert len(traj_data["features"]) > 0
    # Check glucose trajectory
    glucose_traj = next(f for f in traj_data["features"] if f["feature_name"] == "Glucose_Fasting")
    assert len(glucose_traj["points"]) == 3

    # Clinical Report
    report_res = client_with_db.get(f"/api/patients/{patient_id}/report")
    assert report_res.status_code == 200
    report_data = report_res.json()
    assert report_data["full_name"] == "Arthur Pendelton"
    assert len(report_data["risk_summary"]) > 0
    assert len(report_data["action_items"]) > 0
    assert "PULSE Decision Support Engine" in report_data["clinical_disclaimer"]
