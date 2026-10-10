"""
Phase 7 Tests: Clinical AI Co-Pilot, SBAR Handover Generation & Explainability.
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
from server.services.copilot_service import ClinicalCopilotService
from server.crud.patient import get_patient


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


def test_copilot_sbar_generation_outpatient(client_and_session):
    """Test generating structured SBAR handover for an outpatient profile."""
    client, session_maker = client_and_session
    with session_maker() as db:
        patients_resp = client.get("/api/patients?cohort_type=OUTPATIENT_CHRONIC")
        assert patients_resp.status_code == 200
        p_id = patients_resp.json()["items"][0]["id"]

        service = ClinicalCopilotService(db)
        sbar = service.generate_sbar(p_id)

        assert sbar.patient_id == p_id
        assert sbar.mrn is not None
        assert "Outpatient" in sbar.situation or "Screening" in sbar.situation
        assert sbar.background is not None and len(sbar.background) > 10
        assert "PULSE" in sbar.assessment
        assert "Recommendation" in sbar.recommendation or "1." in sbar.recommendation
        assert "SaMD" in sbar.recommendation


def test_copilot_sbar_generation_icu(client_and_session):
    """Test generating structured SBAR handover for an acute ICU patient."""
    client, session_maker = client_and_session
    with session_maker() as db:
        patients_resp = client.get("/api/patients?cohort_type=INPATIENT_ICU")
        assert patients_resp.status_code == 200
        p_id = patients_resp.json()["items"][0]["id"]

        service = ClinicalCopilotService(db)
        sbar = service.generate_sbar(p_id)

        assert sbar.patient_id == p_id
        assert "Intensive Care Unit" in sbar.situation or "ICU" in sbar.situation
        assert "MAP" in sbar.recommendation
        assert "lactate" in sbar.recommendation.lower()


def test_copilot_query_risk_explainability(client_and_session):
    """Test co-pilot query explaining biological risk drivers."""
    client, session_maker = client_and_session
    with session_maker() as db:
        p_id = client.get("/api/patients").json()["items"][0]["id"]

        service = ClinicalCopilotService(db)
        resp = service.answer_query(p_id, "Why is disease risk elevated?")

        assert resp.answer is not None
        assert "PULSE" in resp.answer
        assert len(resp.citations) >= 1
        assert "Nature Computational Science" in resp.citations[0]
        assert len(resp.suggested_followups) > 0


def test_copilot_query_omics_interpretation(client_and_session):
    """Test co-pilot query interpreting synthesized proteomics and metabolomics."""
    client, session_maker = client_and_session
    with session_maker() as db:
        p_id = client.get("/api/patients").json()["items"][0]["id"]

        service = ClinicalCopilotService(db)
        resp = service.answer_query(p_id, "What does the synthesized omics panel show?")

        assert resp.answer is not None
        assert len(resp.citations) >= 1
        assert len(resp.suggested_followups) > 0


def test_copilot_api_endpoint(client_and_session):
    """Test POST /api/patients/{id}/copilot HTTP endpoint."""
    client, _ = client_and_session
    patients_resp = client.get("/api/patients")
    assert patients_resp.status_code == 200
    p_id = patients_resp.json()["items"][0]["id"]

    # Submit query with include_sbar=True
    query_payload = {
        "query": "Summarize patient trajectory and generate SBAR handover",
        "include_sbar": True,
    }
    post_resp = client.post(f"/api/patients/{p_id}/copilot", json=query_payload)
    assert post_resp.status_code == 200
    data = post_resp.json()

    assert "answer" in data
    assert "citations" in data
    assert data["sbar"] is not None
    assert "situation" in data["sbar"]
    assert "recommendation" in data["sbar"]


def test_sbar_api_endpoint_and_audit(client_and_session):
    """Test GET /api/patients/{id}/sbar endpoint and verify audit trail logging."""
    client, _ = client_and_session
    p_id = client.get("/api/patients").json()["items"][0]["id"]

    sbar_resp = client.get(f"/api/patients/{p_id}/sbar")
    assert sbar_resp.status_code == 200
    sbar_data = sbar_resp.json()

    assert sbar_data["patient_id"] == p_id
    assert sbar_data["situation"]
    assert sbar_data["background"]
    assert sbar_data["assessment"]
    assert sbar_data["recommendation"]

    # Verify audit trail recorded the SBAR generation event
    audit_resp = client.get("/api/audit-trail")
    assert audit_resp.status_code == 200
    audit_logs = audit_resp.json()["events"]
    actions = [log["action"] for log in audit_logs]
    assert "GENERATE_SBAR_HANDOVER" in actions or "COPILOT_QUERY" in actions
