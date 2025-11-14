from __future__ import annotations

import uuid
from io import BytesIO
from pathlib import Path

from fastapi import UploadFile
from PIL import Image

from app.core.config import settings

MAX_DIMENSION = 1600
WEBP_QUALITY = 85


def _resize_image(image: Image.Image) -> Image.Image:
    width, height = image.size
    max_edge = max(width, height)
    if max_edge <= MAX_DIMENSION:
        return image
    scale = MAX_DIMENSION / max_edge
    new_size = (int(width * scale), int(height * scale))
    return image.resize(new_size, Image.Resampling.LANCZOS)


async def process_image_upload(file: UploadFile) -> dict[str, object]:
    content = await file.read()
    try:
        image = Image.open(BytesIO(content))
    except OSError as exc:
        raise ValueError("Invalid image file") from exc

    if image.mode not in ("RGB", "RGBA"):
        image = image.convert("RGB")
    else:
        image = image.convert("RGB")

    resized = _resize_image(image)
    buffer = BytesIO()
    resized.save(buffer, format="WEBP", quality=WEBP_QUALITY)
    data = buffer.getvalue()

    filename = f"{uuid.uuid4().hex}.webp"
    media_dir: Path = settings.media_directory
    media_dir.mkdir(parents=True, exist_ok=True)
    file_path = media_dir / filename
    file_path.write_bytes(data)

    return {
        "file_name": filename,
        "file_path": str(file_path),
        "file_url": f"/media/{filename}",
        "mime_type": "image/webp",
        "file_size": len(data),
        "width": resized.width,
        "height": resized.height,
        "original_name": file.filename or filename,
    }
