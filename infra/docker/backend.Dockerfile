FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app
COPY backend/pyproject.toml ./
RUN python -c "import tomllib; p = tomllib.load(open('pyproject.toml', 'rb')); print('\\n'.join(p['project']['dependencies']))" > /tmp/requirements.txt \
    && pip install --no-cache-dir -r /tmp/requirements.txt

COPY backend/app ./app
COPY backend/data ./data
COPY backend/migrations ./migrations
COPY backend/alembic.ini ./
COPY infra/docker/api-entrypoint.sh /usr/local/bin/api-entrypoint

RUN chmod +x /usr/local/bin/api-entrypoint

EXPOSE 8000
CMD ["api-entrypoint"]
