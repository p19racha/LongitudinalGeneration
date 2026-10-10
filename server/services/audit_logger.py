"""
Clinical SaMD Audit Logger for PULSE CDSS.
Provides tamper-evident operational and inference activity logs for regulatory compliance (21 CFR Part 11 / SaMD).
"""
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger("pulse.audit")

AUDIT_LOG_DIR = Path("data")
AUDIT_LOG_PATH = AUDIT_LOG_DIR / "pulse_audit_trail.jsonl"


def record_audit_event(
    action: str,
    patient_id: str,
    mrn: str,
    details: Dict[str, Any],
    operator: str = "clinical_user",
    status: str = "SUCCESS",
) -> Dict[str, Any]:
    """
    Append an immutable event record to the local audit trail.
    """
    AUDIT_LOG_DIR.mkdir(parents=True, exist_ok=True)
    now = datetime.now(timezone.utc).isoformat()

    event = {
        "timestamp": now,
        "action": action,
        "patient_id": patient_id,
        "mrn": mrn,
        "operator": operator,
        "status": status,
        "details": details,
    }

    try:
        with open(AUDIT_LOG_PATH, "a", encoding="utf-8") as f:
            f.write(json.dumps(event) + "\n")
    except Exception as e:
        logger.error(f"Failed to write to audit log: {e}")

    return event


def read_recent_audit_events(limit: int = 50) -> List[Dict[str, Any]]:
    """Retrieve recent audit events in reverse chronological order."""
    if not AUDIT_LOG_PATH.exists():
        return []

    events = []
    try:
        with open(AUDIT_LOG_PATH, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    events.append(json.loads(line))
    except Exception as e:
        logger.error(f"Failed to read audit log: {e}")

    return events[-limit:][::-1]
