"""
Automated unit & integration tests for Phase 8: Population Health Analytics, Triage Radar & Batch CSV Ingestion.
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
from server.services.analytics_service import AnalyticsService


@pytest.fixture
def client_and_session():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        echo=False,
    )
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    with TestingSessionLocal() as session:
        seed_database(session)

    def override_get_db():
        session = TestingSessionLocal()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as test_client:
        yield test_client, TestingSessionLocal

    app.dependency_overrides.clear()


def test_cohort_overview_service_and_api(client_and_session):
    """Test population health overview metrics calculation and HTTP endpoint."""
    client, session_maker = client_and_session

    resp = client.get("/api/analytics/overview")
    assert resp.status_code == 200
    data = resp.json()

    assert data["total_patients"] >= 3
    assert data["outpatient_count"] >= 2
    assert data["icu_count"] >= 1
    assert "CRITICAL" in data["risk_distribution"]
    assert "HIGH" in data["risk_distribution"]
    assert data["total_measurements"] > 0
    assert data["synthetic_omics_count"] >= 0
    assert data["omics_synthesis_rate_pct"] >= 0
    assert isinstance(data["prevalent_high_risk_diseases"], list)


def test_triage_radar_service_and_api(client_and_session):
    """Test longitudinal triage radar queue and velocity prioritization."""
    client, session_maker = client_and_session

    resp = client.get("/api/analytics/triage-radar")
    assert resp.status_code == 200
    data = resp.json()

    assert data["total_patients_analyzed"] >= 3
    assert "urgent_count" in data
    assert len(data["triage_queue"]) >= 3

    # Check first item structure
    first_item = data["triage_queue"][0]
    assert "patient_id" in first_item
    assert "mrn" in first_item
    assert "latest_risk_score" in first_item
    assert "risk_velocity" in first_item
    assert first_item["velocity_direction"] in ("ACCELERATING_UP", "STABLE", "IMPROVING_DOWN")
    assert isinstance(first_item["is_urgent"], bool)


def test_csv_batch_import_pipeline(client_and_session):
    """Test multi-patient CSV ingestion with column aliases and automatic PULSE synthesis."""
    client, session_maker = client_and_session

    csv_data = """mrn,name,age,sex,cohort_type,visit_date,cholesterol,ldl,tg,glucose,hba1c
MRN-BATCH-001,Alice Thompson,64,F,OUTPATIENT_CHRONIC,2025-01-10,240,160,210,115,6.8
MRN-BATCH-001,Alice Thompson,64,F,OUTPATIENT_CHRONIC,2026-01-15,255,175,230,128,7.2
MRN-BATCH-002,Bob Henderson,58,M,INPATIENT_ICU,2026-02-01,180,95,120,95,5.4
"""

    payload = {
        "csv_content": csv_data,
        "auto_run_pulse": True,
    }

    import_resp = client.post("/api/analytics/import-csv", json=payload)
    assert import_resp.status_code == 200
    result = import_resp.json()

    assert result["patients_created"] == 2
    assert result["visits_created"] == 3
    assert result["measurements_created"] > 0
    assert result["pulse_runs_triggered"] == 2
    assert len(result["errors"]) == 0

    # Verify new patients are in the directory and scored
    pat_resp = client.get("/api/patients?search=MRN-BATCH-001")
    assert pat_resp.status_code == 200
    assert pat_resp.json()["total"] == 1
    alice = pat_resp.json()["items"][0]
    assert alice["visit_count"] == 2


def test_csv_import_empty_handling(client_and_session):
    """Test error handling when CSV payload is empty."""
    client, _ = client_and_session

    payload = {"csv_content": "", "auto_run_pulse": False}
    resp = client.post("/api/analytics/import-csv", json=payload)
    assert resp.status_code == 200
    assert len(resp.json()["errors"]) > 0
