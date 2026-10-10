"""
Integration tests for Phase 5: Exporting, SaMD Safety Guardrails & Audit Trail.
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
def client():
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
        yield test_client

    app.dependency_overrides.clear()


def test_fhir_export_endpoint(client):
    """Verify FHIR R4 Bundle export for a patient."""
    patients_res = client.get("/api/patients")
    assert patients_res.status_code == 200
    arthur = patients_res.json()["items"][0]

    # Synthesize first to ensure omics exist
    synth_res = client.post(f"/api/patients/{arthur['id']}/run-pulse")
    assert synth_res.status_code == 200

    # Export FHIR
    fhir_res = client.get(f"/api/patients/{arthur['id']}/export/fhir")
    assert fhir_res.status_code == 200
    bundle = fhir_res.json()

    assert bundle["resourceType"] == "Bundle"
    assert bundle["type"] == "collection"
    assert bundle["total"] > 1

    # First entry is Patient
    assert bundle["entry"][0]["resource"]["resourceType"] == "Patient"
    assert bundle["entry"][0]["resource"]["id"] == arthur["id"]

    # Other entries are Observations
    obs_entries = [e["resource"] for e in bundle["entry"] if e["resource"]["resourceType"] == "Observation"]
    assert len(obs_entries) > 0

    # Check for synthesized tag in at least one observation
    has_synth_tag = any(
        any(tag.get("code") == "pulse-synthesized" for tag in obs.get("meta", {}).get("tag", []))
        for obs in obs_entries
    )
    assert has_synth_tag


def test_csv_export_endpoint(client):
    """Verify CSV export contains header and observations."""
    patients_res = client.get("/api/patients")
    arthur = patients_res.json()["items"][0]

    csv_res = client.get(f"/api/patients/{arthur['id']}/export/csv")
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers.get("content-type", "")

    content = csv_res.text
    lines = content.strip().split("\n")
    assert len(lines) > 1
    header = lines[0].split(",")
    assert "patient_id" in header
    assert "mrn" in header
    assert "feature_name" in header
    assert "is_synthetic" in header


def test_audit_trail_endpoint(client):
    """Verify SaMD audit trail captures inference runs and exports."""
    patients_res = client.get("/api/patients")
    arthur = patients_res.json()["items"][0]

    # Run synthesis
    client.post(f"/api/patients/{arthur['id']}/run-pulse")

    # Check audit trail
    audit_res = client.get("/api/audit-trail")
    assert audit_res.status_code == 200
    data = audit_res.json()
    assert data["total"] > 0
    assert any(e["action"] == "PULSE_SYNTHESIS_EXECUTION" for e in data["events"])
