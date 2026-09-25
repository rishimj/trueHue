"""Guards against regressions in the classifier's in-range / out-of-range accuracy."""

import pytest

from app.classifier import CATEGORIES, IMAGE_EXTENSIONS, REFERENCE_IMAGES_DIR, decode_image

# Measured on the full reference dataset; see README "Validation Results".
MIN_ACCURACY = {"medium-cherry": 0.75, "desert-oak": 0.90, "graphite-walnut": 0.88}


@pytest.mark.slow
@pytest.mark.parametrize("wood", MIN_ACCURACY)
def test_range_accuracy(classifier, wood):
    correct = total = 0
    for category in CATEGORIES:
        for path in sorted((REFERENCE_IMAGES_DIR / wood / category).iterdir()):
            if path.suffix.lower() not in IMAGE_EXTENSIONS:
                continue
            result = classifier.classify(decode_image(path.read_bytes()), wood)
            correct += result.in_range == category.startswith("in-range")
            total += 1
    assert correct / total >= MIN_ACCURACY[wood], f"{wood}: {correct}/{total}"
