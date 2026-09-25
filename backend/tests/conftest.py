import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app import create_app  # noqa: E402
from app.classifier import VeneerClassifier  # noqa: E402


@pytest.fixture(scope="session")
def classifier():
    return VeneerClassifier()


@pytest.fixture()
def client(classifier):
    return create_app(classifier).test_client()
