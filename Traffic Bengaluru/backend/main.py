"""ParkWise AI — FastAPI backend entry point."""

from __future__ import annotations

import logging
import sys
from contextlib import asynccontextmanager
from pathlib import Path

# Ensure project root is on sys.path when launched via uvicorn
PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.core.startup import run_startup
from backend.routers import analytics, hotspots, overview, predict

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    run_startup()
    yield


app = FastAPI(
    title="ParkWise AI",
    description="AI-Powered Parking Enforcement Command Center — Bengaluru Traffic Police",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(predict.router)
app.include_router(hotspots.router)
app.include_router(overview.router)
app.include_router(analytics.router)


@app.get("/health")
def health():
    from backend.ml.inference import ModelRegistry
    from backend.services.cache_service import DataCache

    return {
        "status": "ok",
        "model_loaded": ModelRegistry.is_loaded(),
        "cache_loaded": DataCache._df is not None,
    }
