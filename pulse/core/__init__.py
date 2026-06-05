"""
Core components for PULSE framework.
"""

from pulse.core.encoders import (
    LabTestsEncoder,
    MetabolomicsEncoder,
    PastStateEncoder,
    GenericModalityEncoder
)
from pulse.core.decoders import (
    LabTestsDecoder,
    MetabolomicsDecoder,
    GenericModalityDecoder
)
from pulse.core.alignment import (
    jeffrey_divergence,
    align_distributions_dynamic,
    align_distributions_simple
)
from pulse.core.fusion import (
    compute_visit_state_dynamic,
    AdaptiveVisitStateFusion
)
from pulse.core.temporal import (
    RecurrentTemporalModule,
    TransformerTemporalModule,
    build_temporal_module
)
from pulse.core.adversarial import (
    GradientReversalLayer,
    ModalityMissingnessAdversary,
)

__all__ = [
    "LabTestsEncoder",
    "MetabolomicsEncoder",
    "PastStateEncoder",
    "GenericModalityEncoder",
    "LabTestsDecoder",
    "MetabolomicsDecoder",
    "GenericModalityDecoder",
    "jeffrey_divergence",
    "align_distributions_dynamic",
    "align_distributions_simple",
    "compute_visit_state_dynamic",
    "AdaptiveVisitStateFusion",
    "RecurrentTemporalModule",
    "TransformerTemporalModule",
    "build_temporal_module",
    "GradientReversalLayer",
    "ModalityMissingnessAdversary",
]
