# TrueHue: one image serving the web app and the validation API.

# ---- Web app (Expo web export) ----
FROM node:20-slim AS web
WORKDIR /web
COPY TrueHue/package.json TrueHue/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY TrueHue/ ./
RUN npx expo export --platform web --output-dir dist

# ---- Reference image cache ----
FROM python:3.12-slim AS references
WORKDIR /backend
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/app ./app
COPY backend/scripts ./scripts
COPY backend/data ./data
RUN python scripts/build_references.py /references.npz

# ---- Runtime ----
FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000 \
    WEB_DIR=/srv/web \
    REFERENCE_CACHE=/srv/references.npz
WORKDIR /srv/backend
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/app ./app
COPY backend/wsgi.py ./
COPY backend/data/profiles ./data/profiles
COPY --from=references /references.npz /srv/references.npz
COPY --from=web /web/dist /srv/web
RUN useradd --create-home appuser
USER appuser
EXPOSE 8000
CMD ["sh", "-c", "exec gunicorn --bind 0.0.0.0:${PORT} --workers 2 --threads 2 --timeout 60 --preload wsgi:app"]
