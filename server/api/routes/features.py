"""
Feature catalog endpoints.
"""
from typing import Dict, List
from fastapi import APIRouter
from pydantic import BaseModel

from server.services.feature_definitions import (
    ALL_FEATURES,
    ROUTINE_LAB_FEATURES,
    METABOLOMICS_FEATURES,
    PROTEOMICS_FEATURES,
    FeatureMeta,
)

router = APIRouter(prefix="/features", tags=["Features"])


class FeatureCatalogResponse(BaseModel):
    routine_labs: List[FeatureMeta]
    metabolomics: List[FeatureMeta]
    proteomics: List[FeatureMeta]
    total_count: int


@router.get("", response_model=FeatureCatalogResponse)
def get_features_catalog():
    """Retrieve full catalog of supported clinical features, units, and normal reference ranges."""
    return FeatureCatalogResponse(
        routine_labs=list(ROUTINE_LAB_FEATURES.values()),
        metabolomics=list(METABOLOMICS_FEATURES.values()),
        proteomics=list(PROTEOMICS_FEATURES.values()),
        total_count=len(ALL_FEATURES),
    )
