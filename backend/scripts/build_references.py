"""Precompute resized reference images into a single .npz cache for fast startup.

Usage: python scripts/build_references.py [output_path]
"""

import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.classifier import REFERENCE_CACHE, build_reference_arrays  # noqa: E402

if __name__ == "__main__":
    output = Path(sys.argv[1]) if len(sys.argv) > 1 else REFERENCE_CACHE
    arrays = build_reference_arrays()
    np.savez_compressed(output, **arrays)
    print(f"Wrote {len(arrays)} reference sets to {output}")
