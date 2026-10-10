"""
Automated unit & integration tests for Phase 6: Counterfactual Digital Twin Simulation.
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


def test_simulate_counterfactual_intervention_outpatient(client):
    """Test simulated statin therapy intervention on outpatient cardiometabolic profile."""
    patients_res = client.get("/api/patients")
    arthur = next(p for p in patients_res.json()["items"] if p["full_name"] == "Arthur Pendelton")

    # Run synthesis first
    client.post(f"/api/patients/{arthur['id']}/run-pulse")

    # Simulate lowering LDL from elevated baseline (~165) to therapeutic target 70 mg/dL
    sim_res = client.post(
        f"/api/patients/{arthur['id']}/simulate-intervention",
        json={"interventions": {"ldl_cholesterol": 70.0, "triglycerides": 120.0}},
    )
    assert sim_res.status_code == 200
    data = sim_res.json()

    assert data["patient_id"] == arthur["id"]
    assert len(data["risk_comparisons"]) > 0

    # Verify risk reduction on cardiovascular outcomes
    mi_comp = next((c for c in data["risk_comparisons"] if c["disease_name"] == "myocardial_infarction"), None)
    assert mi_comp is not None
    assert mi_comp["simulated_probability"] <= mi_comp["original_probability"]
    assert mi_comp["absolute_risk_reduction"] >= 0.0


def test_simulate_counterfactual_intervention_icu(client):
    """Test simulated hemodynamic resuscitation intervention on septic ICU trajectory."""
    patients_res = client.get("/api/patients")
    david = next(p for p in patients_res.json()["items"] if p["full_name"] == "David Miller")

    # Run synthesis
    client.post(f"/api/patients/{david['id']}/run-pulse")

    # Simulate restoring MAP to 80 mmHg and clearing lactate to 1.2 mmol/L
    sim_res = client.post(
        f"/api/patients/{david['id']}/simulate-intervention",
        json={"interventions": {"map": 80.0, "lactate": 1.2}},
    )
    assert sim_res.status_code == 200
    data = sim_res.json()

    readm = next((c for c in data["risk_comparisons"] if c["disease_name"] == "icu_readmission"), None)
    assert readm is not None
    assert readm["simulated_probability"] <= readm["original_probability"]
