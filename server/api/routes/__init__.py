"""Routes package exports."""
from server.api.routes.features import router as features_router
from server.api.routes.patients import router as patients_router
from server.api.routes.visits import router as visits_router
from server.api.routes.pulse import router as pulse_router
from server.api.routes.reports import router as reports_router

__all__ = [
    "features_router",
    "patients_router",
    "visits_router",
    "pulse_router",
    "reports_router",
]
