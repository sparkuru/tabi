"""FastAPI application entry point."""

from fastapi import FastAPI

from app.api.routes import admin, auth, catalog, checkins, media, users

app = FastAPI(
    title="Tabi API",
    version="0.1.0",
    openapi_url="/api/openapi.json",
    docs_url="/api/docs",
)

app.include_router(auth.router, prefix="/api")
app.include_router(catalog.router, prefix="/api")
app.include_router(checkins.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(media.router, prefix="/api")
app.include_router(users.router, prefix="/api")


@app.get("/api/health", tags=["health"])
def health() -> dict[str, str]:
    """Report that the API process is serving requests."""
    return {"status": "ok"}
