import base64
import io

import numpy as np
import pytest
from PIL import Image

from app.classifier import CATEGORIES, REFERENCE_IMAGES_DIR, WOOD_TYPES


def encode(path_or_image) -> str:
    image = Image.open(path_or_image) if not isinstance(path_or_image, Image.Image) else path_or_image
    buffer = io.BytesIO()
    image.convert("RGB").save(buffer, format="JPEG")
    return base64.b64encode(buffer.getvalue()).decode()


def sample_path(wood, category):
    return sorted((REFERENCE_IMAGES_DIR / wood / category).iterdir())[0]


def test_health(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.get_json()["woods"] == list(WOOD_TYPES)


@pytest.mark.parametrize("wood", WOOD_TYPES)
def test_classify_returns_consistent_result(client, wood):
    response = client.post(
        "/api/classify", json={"wood": wood, "image": encode(sample_path(wood, "in-range-standard"))}
    )
    assert response.status_code == 200
    body = response.get_json()
    assert body["wood"] == wood
    assert body["predicted_category"] in CATEGORIES
    assert body["in_range"] == body["predicted_category"].startswith("in-range")
    assert set(body["similarity_scores"]) == set(CATEGORIES)
    assert sum(body["similarity_scores"].values()) == pytest.approx(100, abs=0.1)
    assert 50 <= body["confidence"] <= 100


def test_classify_accepts_data_url(client):
    image = "data:image/jpeg;base64," + encode(sample_path("desert-oak", "in-range-light"))
    response = client.post("/api/classify", json={"wood": "desert-oak", "image": image})
    assert response.status_code == 200


@pytest.mark.parametrize(
    "payload, message",
    [
        ({"wood": "pine", "image": "abc"}, "wood"),
        ({"wood": "desert-oak"}, "image"),
        ({"wood": "desert-oak", "image": base64.b64encode(b"not an image").decode()}, "readable"),
    ],
)
def test_classify_rejects_bad_input(client, payload, message):
    response = client.post("/api/classify", json=payload)
    assert response.status_code == 400
    assert message in response.get_json()["error"]


def test_classify_rejects_non_json(client):
    response = client.post("/api/classify", data="hello", content_type="text/plain")
    assert response.status_code == 400


def test_compare_identical_images_is_zero(client):
    image = encode(sample_path("medium-cherry", "in-range-dark"))
    response = client.post("/api/compare", json={"image1": image, "image2": image})
    assert response.status_code == 200
    assert response.get_json()["normalized_difference"] < 1


def test_compare_black_and_white_is_maximal(client):
    black = encode(Image.fromarray(np.zeros((50, 50, 3), np.uint8)))
    white = encode(Image.fromarray(np.full((50, 50, 3), 255, np.uint8)))
    body = client.post("/api/compare", json={"image1": black, "image2": white}).get_json()
    assert body["normalized_difference"] == pytest.approx(100)


def test_unknown_api_route_returns_json_404(client):
    response = client.get("/api/nope")
    assert response.status_code == 404
    assert "error" in response.get_json()
