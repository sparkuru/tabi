"""Validate, strip metadata and store private image derivatives."""

from io import BytesIO
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, UploadFile, status
from PIL import Image, ImageOps, UnidentifiedImageError

from app.core.config import get_settings

Image.MAX_IMAGE_PIXELS = 20_000_000


async def store_image(upload: UploadFile) -> tuple[str, str]:
    """Store a reencoded JPEG and thumbnail in the private media root."""
    settings = get_settings()
    data = await upload.read(settings.max_upload_bytes + 1)
    if len(data) > settings.max_upload_bytes:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "Image too large")
    try:
        with Image.open(BytesIO(data)) as source:
            if source.format not in {"JPEG", "PNG", "WEBP"}:
                raise ValueError("Unsupported image type")
            image = ImageOps.exif_transpose(source).convert("RGB")
            image.thumbnail((2400, 2400), Image.Resampling.LANCZOS)
            thumbnail = image.copy()
            thumbnail.thumbnail((640, 640), Image.Resampling.LANCZOS)
    except (UnidentifiedImageError, ValueError, Image.DecompressionBombError) as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Invalid image") from exc

    image_id = uuid4().hex
    original_key = f"originals/{image_id}.jpg"
    thumbnail_key = f"thumbs/{image_id}.jpg"
    original_path = settings.media_root / original_key
    thumbnail_path = settings.media_root / thumbnail_key
    original_path.parent.mkdir(parents=True, exist_ok=True)
    thumbnail_path.parent.mkdir(parents=True, exist_ok=True)
    try:
        _save_jpeg(image, original_path)
        _save_jpeg(thumbnail, thumbnail_path)
    except OSError:
        original_path.unlink(missing_ok=True)
        thumbnail_path.unlink(missing_ok=True)
        raise
    return original_key, thumbnail_key


def _save_jpeg(image: Image.Image, destination: Path) -> None:
    """Write an image without source metadata via an atomic rename."""
    temporary = destination.with_suffix(".tmp")
    try:
        image.save(temporary, format="JPEG", quality=85, optimize=True)
        temporary.replace(destination)
    finally:
        temporary.unlink(missing_ok=True)


def media_path(key: str) -> Path:
    """Resolve an internally generated storage key under the configured root."""
    path = get_settings().media_root / key
    if not path.resolve().is_relative_to(get_settings().media_root.resolve()):
        raise ValueError("Invalid media key")
    return path
