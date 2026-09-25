"""TrueHue API: veneer color validation over HTTP."""

from __future__ import annotations

import base64
import binascii
import logging
import os
from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from werkzeug.exceptions import HTTPException

from .classifier import (
    CATEGORIES,
    WOOD_TYPES,
    InvalidImageError,
    VeneerClassifier,
    compare_images,
    decode_image,
)

logging.basicConfig(level=os.environ.get("LOG_LEVEL", "INFO"))

MAX_UPLOAD_MB = 25


class BadRequest(Exception):
    pass


def _decode_base64_image(value: object, field: str):
    if not isinstance(value, str) or not value:
        raise BadRequest(f"'{field}' must be a non-empty base64 image string")
    # Accept data URLs such as "data:image/jpeg;base64,/9j/..."
    if value.startswith("data:"):
        value = value.partition(",")[2]
    try:
        raw = base64.b64decode(value, validate=False)
    except (binascii.Error, ValueError):
        raise BadRequest(f"'{field}' is not valid base64")
    try:
        return decode_image(raw)
    except InvalidImageError:
        raise BadRequest(f"'{field}' is not a readable image")


def _json_body() -> dict:
    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        raise BadRequest("Request body must be a JSON object")
    return body


def create_app(classifier: VeneerClassifier | None = None) -> Flask:
    app = Flask(__name__, static_folder=None)
    app.config["MAX_CONTENT_LENGTH"] = MAX_UPLOAD_MB * 1024 * 1024
    CORS(app, resources={r"/api/*": {"origins": os.environ.get("CORS_ORIGINS", "*")}})

    model = classifier or VeneerClassifier()

    @app.errorhandler(BadRequest)
    def handle_bad_request(error):
        return jsonify(error=str(error)), 400

    @app.errorhandler(HTTPException)
    def handle_http_error(error):
        if request.path.startswith("/api/"):
            return jsonify(error=error.description), error.code
        return error

    @app.get("/api/health")
    def health():
        return jsonify(status="ok", woods=list(WOOD_TYPES), categories=list(CATEGORIES))

    @app.post("/api/classify")
    def classify():
        body = _json_body()
        wood = body.get("wood")
        if wood not in WOOD_TYPES:
            raise BadRequest(f"'wood' must be one of: {', '.join(WOOD_TYPES)}")
        sample = _decode_base64_image(body.get("image"), "image")
        return jsonify(model.classify(sample, wood).to_dict())

    @app.post("/api/compare")
    def compare():
        body = _json_body()
        first = _decode_base64_image(body.get("image1"), "image1")
        second = _decode_base64_image(body.get("image2"), "image2")
        return jsonify(compare_images(first, second))

    web_dir = os.environ.get("WEB_DIR")
    if web_dir and Path(web_dir).is_dir():
        web_root = Path(web_dir).resolve()

        # Serve the exported Expo web app, falling back to index.html for client routes.
        @app.get("/", defaults={"path": ""})
        @app.get("/<path:path>")
        def web(path: str):
            if path.startswith("api/"):
                return jsonify(error="Not found"), 404
            if path and (web_root / path).is_file():
                return send_from_directory(web_root, path)
            return send_from_directory(web_root, "index.html")

    return app
