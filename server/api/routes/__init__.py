"""Routes package exports."""
from server.api.routes.features import router as features_router
from server.api.routes.patients import router as patients_router
from server.api.routes.visits import router as visits_router
from server.api.routes.pulse import router as pulse_router
from server.api.routes.reports import router as reports_router
from server.api.routes.exports import router as exports_router
from server.api.routes.copilot import router as copilot_router
from server.api.routes.analytics import router as analytics_router

__all__ = [
    "features_router",
    "patients_router",
    "visits_router",
    "pulse_router",
    "reports_router",
    "exports_router",
    "copilot_router",
    "analytics_router",
]
