import re
import uuid
from decimal import Decimal

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from app.models import ProductStatus
from app.tests.utils.category import create_random_category
from app.tests.utils.product import create_random_product


def _decimal(value: str | float | int) -> Decimal:
    return Decimal(str(value))


def _slugify(value: str) -> str:
    value = value.strip().lower()
    value = re.sub(r"[^\w\s-]", "", value)
    value = re.sub(r"[\s_-]+", "-", value)
    value = re.sub(r"^-+|-+$", "", value)
    return value or "product"


def _assert_slug_with_suffix(actual_slug: str, base_slug: str) -> None:
    assert actual_slug.startswith(f"{base_slug}-")
    suffix = actual_slug[len(base_slug) + 1 :]
    assert len(suffix) == 5
    assert all(ch in "0123456789abcdef" for ch in suffix.lower())


def test_create_product(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    category = create_random_category(db)
    data = {
        "name": "Sneakers",
        "description": "Comfortable running shoes",
        "thumbnail_image": "https://example.com/sneakers-thumb.jpg",
        "images": ["https://example.com/sneakers-1.jpg"],
        "category_id": str(category.id),
        "price": "59.90",
        "price_origin": "79.90",
        "stock": 10,
        "status": ProductStatus.published.value,
    }
    response = client.post(
        f"{settings.API_V1_STR}/products/",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 201
    content = response.json()
    assert content["name"] == data["name"]
    assert content["description"] == data["description"]
    assert content["thumbnail_image"] == data["thumbnail_image"]
    assert content["images"] == data["images"]
    assert content["category_id"] == str(category.id)
    expected_base = _slugify(data["name"])
    _assert_slug_with_suffix(content["slug"], expected_base)
    assert _decimal(content["price"]) == _decimal(data["price"])
    assert _decimal(content["price_origin"]) == _decimal(data["price_origin"])
    assert content["stock"] == data["stock"]
    assert content["status"] == data["status"]


def test_create_product_same_name_generates_unique_slug(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    product = create_random_product(db)
    category = create_random_category(db)
    data = {
        "name": product.name,
        "category_id": str(category.id),
        "price": "10.00",
    }
    response = client.post(
        f"{settings.API_V1_STR}/products/",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 201
    content = response.json()
    expected_base = _slugify(data["name"])
    _assert_slug_with_suffix(content["slug"], expected_base)
    assert content["slug"] != product.slug


def test_create_product_invalid_category(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    data = {
        "name": "Invalid Category",
        "category_id": str(uuid.uuid4()),
        "price": "10.00",
    }
    response = client.post(
        f"{settings.API_V1_STR}/products/",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 404
    assert response.json()["detail"] == "Category not found"


def test_read_product(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    product = create_random_product(db)
    response = client.get(
        f"{settings.API_V1_STR}/products/{product.id}",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["id"] == str(product.id)
    assert content["name"] == product.name
    assert content["slug"] == product.slug
    assert content["category_id"] == str(product.category_id)


def test_read_product_not_found(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    response = client.get(
        f"{settings.API_V1_STR}/products/{uuid.uuid4()}",
        headers=superuser_token_headers,
    )
    assert response.status_code == 404
    assert response.json()["detail"] == "Product not found"


def test_read_products(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    create_random_product(db)
    response = client.get(
        f"{settings.API_V1_STR}/products/",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["count"] >= 1
    assert isinstance(content["data"], list)
    assert content["data"]


def test_filter_products_by_status(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    create_random_product(db)
    response = client.get(
        f"{settings.API_V1_STR}/products/?status={ProductStatus.published.value}",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    content = response.json()
    assert all(
        item["status"] == ProductStatus.published.value for item in content["data"]
    )


def test_update_product(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    product = create_random_product(db)
    category = create_random_category(db)
    data = {
        "name": "Updated Name",
        "category_id": str(category.id),
        "price": "29.99",
        "status": ProductStatus.draft.value,
    }
    response = client.put(
        f"{settings.API_V1_STR}/products/{product.id}",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["name"] == data["name"]
    expected_base = _slugify(data["name"])
    _assert_slug_with_suffix(content["slug"], expected_base)
    assert content["category_id"] == data["category_id"]
    assert _decimal(content["price"]) == _decimal(data["price"])
    assert content["status"] == data["status"]


def test_update_product_not_found(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    data = {"name": "Updated Name"}
    response = client.put(
        f"{settings.API_V1_STR}/products/{uuid.uuid4()}",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 404
    assert response.json()["detail"] == "Product not found"


def test_update_product_duplicate_name(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    product = create_random_product(db)
    other_product = create_random_product(db)
    data = {"name": other_product.name}
    response = client.put(
        f"{settings.API_V1_STR}/products/{product.id}",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 200
    content = response.json()
    expected_base = _slugify(other_product.name)
    _assert_slug_with_suffix(content["slug"], expected_base)
    assert content["slug"] != other_product.slug


def test_update_product_invalid_category(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    product = create_random_product(db)
    data = {
        "category_id": str(uuid.uuid4()),
    }
    response = client.put(
        f"{settings.API_V1_STR}/products/{product.id}",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 404
    assert response.json()["detail"] == "Category not found"


def test_delete_product(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    product = create_random_product(db)
    response = client.delete(
        f"{settings.API_V1_STR}/products/{product.id}",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    assert response.json()["message"] == "Product deleted successfully"


def test_delete_product_not_found(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    response = client.delete(
        f"{settings.API_V1_STR}/products/{uuid.uuid4()}",
        headers=superuser_token_headers,
    )
    assert response.status_code == 404
    assert response.json()["detail"] == "Product not found"
