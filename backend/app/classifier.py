"""Reference-profile color classifier for wood veneer samples.

A sample image is compared pixel by pixel against reference images from each
shade category of a veneer finish. The mean RGB distance to each category forms
the sample's "distance profile", which is matched against the reference
profiles computed offline (``data/profiles/<wood>.csv``). The closest profile
determines the predicted category.
"""

from __future__ import annotations

import csv
import io
import logging
import os
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
PROFILES_DIR = DATA_DIR / "profiles"
REFERENCE_IMAGES_DIR = DATA_DIR / "reference_images"
REFERENCE_CACHE = Path(os.environ.get("REFERENCE_CACHE", DATA_DIR / "references.npz"))

WOOD_TYPES = ("medium-cherry", "desert-oak", "graphite-walnut")

# Ordered from lightest to darkest; matches the reference profile CSV columns.
CATEGORIES = (
    "out-of-range-too-light",
    "in-range-light",
    "in-range-standard",
    "in-range-dark",
    "out-of-range-too-dark",
)

COMPARE_SIZE = (300, 300)
MAX_REFERENCES_PER_CATEGORY = 20
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff"}


class InvalidImageError(ValueError):
    """Raised when uploaded bytes cannot be decoded as an image."""


@dataclass(frozen=True)
class Classification:
    wood: str
    predicted_category: str
    in_range: bool
    confidence: float
    similarity_scores: dict[str, float]
    distance_profile: dict[str, float]

    def to_dict(self) -> dict:
        return {
            "wood": self.wood,
            "predicted_category": self.predicted_category,
            "in_range": self.in_range,
            "confidence": self.confidence,
            "similarity_scores": self.similarity_scores,
            "distance_profile": self.distance_profile,
        }


def to_compare_array(image: Image.Image) -> np.ndarray:
    """Resize an image to the comparison size and return it as uint8 RGB."""
    return np.asarray(image.resize(COMPARE_SIZE).convert("RGB"), dtype=np.uint8)


def decode_image(data: bytes) -> np.ndarray:
    try:
        with Image.open(io.BytesIO(data)) as image:
            return to_compare_array(image)
    except Exception as exc:  # PIL raises several unrelated exception types
        raise InvalidImageError("Could not decode image data") from exc


def mean_rgb_distance(references: np.ndarray, sample: np.ndarray) -> np.ndarray:
    """Mean per-pixel Euclidean RGB distance between ``sample`` and each reference."""
    diff = references.astype(np.float32) - sample.astype(np.float32)
    return np.sqrt((diff * diff).sum(axis=-1)).mean(axis=(-2, -1))


def normalize_distance(distance: float) -> float:
    """Map a mean RGB distance (0 to ~441) onto the 0-100 scale used by the profiles."""
    return min(100.0, float(distance) / 2.55)


def _reference_paths(wood: str, category: str) -> list[Path]:
    folder = REFERENCE_IMAGES_DIR / wood / category
    paths = sorted(p for p in folder.iterdir() if p.suffix.lower() in IMAGE_EXTENSIONS)
    if len(paths) > MAX_REFERENCES_PER_CATEGORY:
        rng = np.random.default_rng(42)
        picked = rng.choice(len(paths), MAX_REFERENCES_PER_CATEGORY, replace=False)
        paths = [paths[i] for i in sorted(picked)]
    return paths


def build_reference_arrays() -> dict[str, np.ndarray]:
    """Load and resize the sampled reference images, keyed by ``wood/category``."""
    arrays = {}
    for wood in WOOD_TYPES:
        for category in CATEGORIES:
            images = []
            for path in _reference_paths(wood, category):
                with Image.open(path) as image:
                    images.append(to_compare_array(image))
            arrays[f"{wood}/{category}"] = np.stack(images)
    return arrays


def load_reference_arrays() -> dict[str, np.ndarray]:
    if REFERENCE_CACHE.exists():
        with np.load(REFERENCE_CACHE) as cache:
            return {key: cache[key] for key in cache.files}
    logger.info("Reference cache not found, loading reference images from %s", REFERENCE_IMAGES_DIR)
    return build_reference_arrays()


def load_profiles(wood: str) -> np.ndarray:
    """Return the 5x5 reference profile matrix (rows and columns in CATEGORIES order)."""
    with open(PROFILES_DIR / f"{wood}.csv", newline="") as f:
        rows = list(csv.reader(f))
    header = rows[0][1:]
    table = {row[0]: dict(zip(header, map(float, row[1:]))) for row in rows[1:]}
    return np.array([[table[r][c] for c in CATEGORIES] for r in CATEGORIES])


class VeneerClassifier:
    def __init__(self) -> None:
        self.references = load_reference_arrays()
        self.profiles = {wood: load_profiles(wood) for wood in WOOD_TYPES}
        logger.info("Loaded %d reference image sets", len(self.references))

    def classify(self, sample: np.ndarray, wood: str) -> Classification:
        if wood not in WOOD_TYPES:
            raise ValueError(f"Unknown wood type '{wood}'")

        profile = np.array([
            normalize_distance(mean_rgb_distance(self.references[f"{wood}/{c}"], sample).mean())
            for c in CATEGORIES
        ])
        profile_distances = np.linalg.norm(self.profiles[wood] - profile, axis=1)
        similarity = 1.0 / (1.0 + profile_distances)
        similarity /= similarity.sum()

        best = int(similarity.argmax())
        predicted = CATEGORIES[best]
        in_range = predicted.startswith("in-range")
        # How decisively the best match beats the closest category on the other side of the range limit.
        rival = max(s for c, s in zip(CATEGORIES, similarity) if c.startswith("in-range") != in_range)
        confidence = similarity[best] / (similarity[best] + rival)

        return Classification(
            wood=wood,
            predicted_category=predicted,
            in_range=in_range,
            confidence=round(float(confidence) * 100, 2),
            similarity_scores={c: round(float(s) * 100, 2) for c, s in zip(CATEGORIES, similarity)},
            distance_profile={c: round(float(d), 3) for c, d in zip(CATEGORIES, profile)},
        )


def compare_images(first: np.ndarray, second: np.ndarray) -> dict[str, float]:
    distance = float(mean_rgb_distance(first, second))
    return {"difference": round(distance, 3), "normalized_difference": round(normalize_distance(distance), 3)}
