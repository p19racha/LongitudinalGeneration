"""
CLI utility to initialize and seed the PULSE Clinical Decision Support database.
"""
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from server.config import settings
from server.db.session import engine, init_db, SessionLocal
from server.demo_data.seed_data import seed_database


def main() -> None:
    print(f"Initializing database at: {settings.DATABASE_PATH} ...")
    init_db()
    print("Database tables initialized successfully.")

    with SessionLocal() as db:
        print("Seeding demonstration patient cohorts...")
        patients = seed_database(db, overwrite=True)
        print(f"Seeded {len(patients)} demonstration clinical profiles:")
        for p in patients:
            print(f"  - [{p.cohort_type.value}] {p.full_name} ({p.mrn}): {len(p.visits)} longitudinal visits recorded.")
    print("Database initialization complete.")


if __name__ == "__main__":
    main()
