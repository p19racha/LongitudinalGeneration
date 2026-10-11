"""
Automated unit & integration tests for Phase 9: HL7 FHIR CDS Hooks & Real-Time Clinical Deterioration Alerts.
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
from server.services.cds_hooks_service import CDSHooksService
from server.services.alert_service import AlertService


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


def test_cds_service_discovery(client_and_session):
    """Test official HL7 CDS Hooks service discovery endpoint."""
    client, _ = client_and_session

    resp = client.get("/cds-services")
    assert resp.status_code == 200
    data = resp.json()

    assert "services" in data
    assert len(data["services"]) >= 2
    service_ids = [s["id"] for s in data["services"]]
    assert "pulse-patient-view" in service_ids
    assert "pulse-order-select" in service_ids

    # Also test alias under /api
    alias_resp = client.get("/api/cds-services")
    assert alias_resp.status_code == 200
    assert len(alias_resp.json()["services"]) >= 2


def test_cds_patient_view_hook_icu(client_and_session):
    """Test patient-view hook evaluation for acute ICU patient with critical risk cards."""
    client, _ = client_and_session

    # Fetch patient list to get actual ICU patient id
    pats_resp = client.get("/api/patients?cohort=INPATIENT_ACUTE_ICU")
    assert pats_resp.status_code == 200
    items = pats_resp.json()["items"]
    assert len(items) > 0
    icu_patient = items[0]

    payload = {
        "hook": "patient-view",
        "hookInstance": "test-uuid-icu-01",
        "context": {
            "patientId": icu_patient["id"],
            "userId": "Practitioner/attending-01",
        },
    }

    resp = client.post("/cds-services/pulse-patient-view", json=payload)
    assert resp.status_code == 200
    data = resp.json()

    assert "cards" in data
    assert len(data["cards"]) > 0

    first_card = data["cards"][0]
    assert "summary" in first_card
    assert "indicator" in first_card
    assert first_card["indicator"] in ("critical", "warning", "info")
    assert "source" in first_card
    assert "PULSE" in first_card["source"]["label"]


def test_cds_patient_view_hook_outpatient(client_and_session):
    """Test patient-view hook evaluation for chronic outpatient."""
    client, _ = client_and_session

    pats_resp = client.get("/api/patients?cohort=OUTPATIENT_CHRONIC")
    assert pats_resp.status_code == 200
    items = pats_resp.json()["items"]
    assert len(items) > 0
    op_patient = items[0]

    payload = {
        "hook": "patient-view",
        "context": {
            "patientId": op_patient["id"],
        },
    }

    resp = client.post("/cds-services/pulse-patient-view", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert "cards" in data
    assert len(data["cards"]) > 0


def test_cds_order_select_hook(client_and_session):
    """Test order-select hook evaluating draft medication/lab orders."""
    client, _ = client_and_session

    pats_resp = client.get("/api/patients")
    patient = pats_resp.json()["items"][0]

    payload = {
        "hook": "order-select",
        "context": {
            "patientId": patient["id"],
            "selections": ["MedicationRequest/metformin-1000mg"],
        },
    }

    resp = client.post("/cds-services/pulse-order-select", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert "cards" in data
    assert len(data["cards"]) > 0


def test_clinical_alerts_lifecycle_and_audit(client_and_session):
    """Test deterioration alerts scan, retrieval, clinician acknowledgment, and audit trail."""
    client, session_maker = client_and_session

    # 1. Trigger population scan
    scan_resp = client.post("/api/alerts/scan")
    assert scan_resp.status_code == 200
    scan_data = scan_resp.json()
    assert scan_data["total_alerts"] > 0
    assert "unacknowledged_count" in scan_data
    assert "critical_count" in scan_data

    # 2. Get active alerts
    get_resp = client.get("/api/alerts")
    assert get_resp.status_code == 200
    alerts = get_resp.json()["alerts"]
    assert len(alerts) > 0

    first_alert = alerts[0]
    alert_id = first_alert["id"]
    assert first_alert["severity"] in ("CRITICAL", "WARNING", "INFO")
    assert first_alert["is_acknowledged"] is False

    # 3. Acknowledge alert
    ack_payload = {
        "acknowledged_by": "Dr. Sarah Lin, MD",
        "note": "Attending clinical review complete; initiating arterial line catheterization.",
    }
    ack_resp = client.post(f"/api/alerts/{alert_id}/acknowledge", json=ack_payload)
    assert ack_resp.status_code == 200
    ack_data = ack_resp.json()
    assert ack_data["is_acknowledged"] is True
    assert ack_data["acknowledged_by"] == "Dr. Sarah Lin, MD"
    assert ack_data["acknowledged_at"] is not None

    # 4. Verify audit trail event recorded
    audit_resp = client.get("/api/audit-trail")
    assert audit_resp.status_code == 200
    audit_data = audit_resp.json()
    events_list = audit_data.get("events") or audit_data.get("items") or []
    actions = [e["action"] for e in events_list]
    assert "CLINICAL_ALERT_ACKNOWLEDGED" in actions
