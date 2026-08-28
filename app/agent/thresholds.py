"""
Heat-safety thresholds used by the agent when it reasons over tool
results. These are placeholder bands loosely based on common heat-index
guidance — replace with WHO / IMD / local-authority advisory numbers
before using this for real safety decisions.

Exposed as plain constants (not hidden inside a prompt) so they can be
unit-tested, tuned, and cited in the README / demo.
"""
from app.config import settings

SAFE_MAX_C = settings.default_safe_max_c        # e.g. 35.0
CAUTION_MAX_C = settings.default_caution_max_c  # e.g. 40.0

# Continuous exceedance of SAFE_MAX_C longer than this pushes Caution -> Unsafe
MAX_SAFE_EXCEEDANCE_HOURS = 2.0

THRESHOLD_SUMMARY = f"""
Heat-safety bands (heat index, °C):
  Safe:    < {SAFE_MAX_C}
  Caution: {SAFE_MAX_C} - {CAUTION_MAX_C}, and exceedance of {SAFE_MAX_C}C
           lasting less than {MAX_SAFE_EXCEEDANCE_HOURS} continuous hours
  Unsafe:  > {CAUTION_MAX_C} at any point, OR exceedance of {SAFE_MAX_C}C
           for {MAX_SAFE_EXCEEDANCE_HOURS}+ continuous hours
""".strip()


def classify_point(heat_index_c: float, exceedance_hours: float = 0.0) -> str:
    """Simple deterministic classifier used as a sanity check / fallback
    alongside the LLM's own reasoning (and, in Phase 4, the ML model)."""
    if heat_index_c > CAUTION_MAX_C:
        return "Unsafe"
    if heat_index_c >= SAFE_MAX_C and exceedance_hours >= MAX_SAFE_EXCEEDANCE_HOURS:
        return "Unsafe"
    if heat_index_c >= SAFE_MAX_C:
        return "Caution"
    return "Safe"
