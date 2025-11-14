import base64
import io

from fastapi.testclient import TestClient

from app.core.config import settings

TEST_IMAGE_BASE64 = b"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4PwAD/gL+hSp/AAAAAElFTkSuQmCC"


def _image_bytes() -> bytes:
    return base64.b64decode(TEST_IMAGE_BASE64)


def test_upload_media(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    files = {"file": ("tiny.png", io.BytesIO(_image_bytes()), "image/png")}
    response = client.post(
        f"{settings.API_V1_STR}/media/upload",
        headers=superuser_token_headers,
        files=files,
    )
    assert response.status_code == 201
    content = response.json()
    assert content["file_url"].startswith("/media/")
    assert content["mime_type"] == "image/webp"
    assert content["width"] == 1
    assert content["height"] == 1


def test_list_media(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    response = client.get(
        f"{settings.API_V1_STR}/media",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    payload = response.json()
    assert isinstance(payload["data"], list)
    assert isinstance(payload["count"], int)


def test_delete_media(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    files = {"file": ("tiny.png", io.BytesIO(_image_bytes()), "image/png")}
    upload = client.post(
        f"{settings.API_V1_STR}/media/upload",
        headers=superuser_token_headers,
        files=files,
    )
    assert upload.status_code == 201
    media_id = upload.json()["id"]

    delete = client.delete(
        f"{settings.API_V1_STR}/media/{media_id}",
        headers=superuser_token_headers,
    )
    assert delete.status_code == 204
