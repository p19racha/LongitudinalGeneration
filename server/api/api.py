"""
Master API router bundling all sub-routes.
"""
from fastapi import APIRouter
from server.api.routes import (
    features_router,
    patients_router,
    visits_router,
    pulse_router,
    reports_router,
)

api_router = APIRouter()

api_router.include_router(features_router)
api_router.include_router(patients_router)
api_router.include_router(visits_router)
api_router.include_router(pulse_router)
api_router.include_router(reports_router)
