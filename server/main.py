"""
FastAPI application entrypoint for PULSE Clinical Decision Support System.
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import logging

from server.config import settings
from server.db.session import init_db, SessionLocal
from server.demo_data.seed_data import seed_database
from server.api.api import api_router

logger = logging.getLogger("server.main")


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

# CORS configuration - supports credentials with regex for localhost, 127.0.0.1, and Tauri webview origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://tauri.localhost",
        "https://tauri.localhost",
        "tauri://localhost",
    ],
    allow_origin_regex=r"(https?://(localhost|127\.0\.0\.1|tauri\.localhost)(:[0-9]+)?|tauri://.*)",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled server exception: %s", exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)},
        headers={
            "Access-Control-Allow-Origin": request.headers.get("origin", "*"),
            "Access-Control-Allow-Credentials": "true",
        },
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


@app.post("/api/system/open-browser")
def open_browser():
    """Launch the user's default web browser pointing to the application."""
    import webbrowser
    url = "http://localhost:8000"
    try:
        webbrowser.open(url)
        return {"success": True, "url": url}
    except Exception as e:
        return {"success": False, "error": str(e), "url": url}


# Mount compiled static frontend if available
import os
from fastapi.staticfiles import StaticFiles

_frontend_out_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "out")
if os.path.exists(_frontend_out_dir):
    app.mount("/", StaticFiles(directory=_frontend_out_dir, html=True), name="frontend_static")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server.main:app", host="0.0.0.0", port=8000, reload=True)
