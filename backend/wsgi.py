"""WSGI entry point: ``gunicorn wsgi:app`` or ``python wsgi.py`` for local development."""

import os

from app import create_app

app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 3050)))
