import uuid

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from app.tests.utils.category import create_random_category
from app.tests.utils.utils import random_lower_string


def test_create_category(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    slug = f"category-{random_lower_string()}"
    data = {
        "name": "Shoes",
        "slug": slug,
        "description": "Footwear and related accessories",
    }
    response = client.post(
        f"{settings.API_V1_STR}/categories/",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 201
    content = response.json()
    assert content["name"] == data["name"]
    assert content["slug"] == data["slug"]
    assert content["description"] == data["description"]
    assert "id" in content
    assert "created_at" in content
    assert "updated_at" in content


def test_create_category_duplicate_slug(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    category = create_random_category(db)
    data = {"name": "Duplicate", "slug": category.slug}
    response = client.post(
        f"{settings.API_V1_STR}/categories/",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 409
    content = response.json()
    assert content["detail"] == "Slug already exists"


def test_read_category(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    category = create_random_category(db)
    response = client.get(
        f"{settings.API_V1_STR}/categories/{category.id}",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["name"] == category.name
    assert content["slug"] == category.slug
    assert content["description"] == category.description
    assert content["id"] == str(category.id)


def test_read_category_not_found(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    response = client.get(
        f"{settings.API_V1_STR}/categories/{uuid.uuid4()}",
        headers=superuser_token_headers,
    )
    assert response.status_code == 404
    content = response.json()
    assert content["detail"] == "Category not found"


def test_read_categories(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    create_random_category(db)
    create_random_category(db)
    response = client.get(
        f"{settings.API_V1_STR}/categories/",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["count"] >= 2
    assert isinstance(content["data"], list)
    assert content["data"]


def test_update_category(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    category = create_random_category(db)
    slug = f"updated-{random_lower_string()}"
    data = {
        "name": "Updated Category",
        "slug": slug,
        "description": "Updated description",
    }
    response = client.put(
        f"{settings.API_V1_STR}/categories/{category.id}",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["name"] == data["name"]
    assert content["slug"] == data["slug"]
    assert content["description"] == data["description"]
    assert content["id"] == str(category.id)


def test_update_category_not_found(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    data = {"name": "Updated Category"}
    response = client.put(
        f"{settings.API_V1_STR}/categories/{uuid.uuid4()}",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 404
    content = response.json()
    assert content["detail"] == "Category not found"


def test_update_category_duplicate_slug(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    category = create_random_category(db)
    other_category = create_random_category(db)
    data = {"slug": other_category.slug}
    response = client.put(
        f"{settings.API_V1_STR}/categories/{category.id}",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 409
    content = response.json()
    assert content["detail"] == "Slug already exists"


def test_delete_category(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    category = create_random_category(db)
    response = client.delete(
        f"{settings.API_V1_STR}/categories/{category.id}",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["message"] == "Category deleted successfully"


def test_delete_category_not_found(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    response = client.delete(
        f"{settings.API_V1_STR}/categories/{uuid.uuid4()}",
        headers=superuser_token_headers,
    )
    assert response.status_code == 404
    content = response.json()
    assert content["detail"] == "Category not found"
