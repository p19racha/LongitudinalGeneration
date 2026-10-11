"""
FastAPI application entrypoint for PULSE Clinical Decision Support System.
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from server.config import settings
from server.db.session import init_db, SessionLocal
from server.demo_data.seed_data import seed_database
from server.api.api import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown lifespan context."""
    # Initialize database tables
    init_db()

    # Automatically seed demonstration cohorts if enabled and DB is empty
    if settings.AUTO_SEED_DEMO_DATA:
        with SessionLocal() as db:
            seed_database(db, overwrite=False)

    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=(
        "PULSE Clinical Decision Support System (CDSS) REST API. "
        "Enables interactive patient profile construction, longitudinal mosaic data storage, "
        "deep omics synthesis (metabolomics & proteomics), and 10-year / 30-day clinical disease risk forecasting."
    ),
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins for local/clinical frontend development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["Health"])
def health_check():
    """Health check endpoint verifying server operational status."""
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
    }


from server.api.routes.cds_hooks import cds_hooks_router

# Include Master API router under /api
app.include_router(api_router, prefix=settings.API_V1_STR)

# Include CDS Hooks & Clinical Alert router
app.include_router(cds_hooks_router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server.main:app", host="0.0.0.0", port=8000, reload=True)
