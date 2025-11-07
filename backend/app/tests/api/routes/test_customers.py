import uuid

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from app.tests.utils.customer import create_random_customer, random_phone
from app.tests.utils.utils import random_email


def test_create_customer(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    data = {
        "name": "John Doe",
        "phone": random_phone(),
        "email": random_email(),
        "address": "123 Main St",
    }
    response = client.post(
        f"{settings.API_V1_STR}/customers/",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 201
    content = response.json()
    assert content["name"] == data["name"]
    assert content["phone"] == data["phone"]
    assert content["email"] == data["email"]
    assert content["address"] == data["address"]
    assert "id" in content


def test_create_customer_duplicate_phone(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    customer = create_random_customer(db)
    data = {
        "name": "Jane Doe",
        "phone": customer.phone,
    }
    response = client.post(
        f"{settings.API_V1_STR}/customers/",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 409
    assert response.json()["detail"] == "Phone number already registered"


def test_read_customer(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    customer = create_random_customer(db)
    response = client.get(
        f"{settings.API_V1_STR}/customers/{customer.id}",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["id"] == str(customer.id)
    assert content["name"] == customer.name
    assert content["phone"] == customer.phone


def test_read_customer_not_found(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    response = client.get(
        f"{settings.API_V1_STR}/customers/{uuid.uuid4()}",
        headers=superuser_token_headers,
    )
    assert response.status_code == 404
    assert response.json()["detail"] == "Customer not found"


def test_read_customers(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    create_random_customer(db)
    response = client.get(
        f"{settings.API_V1_STR}/customers/",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["count"] >= 1
    assert isinstance(content["data"], list)


def test_update_customer(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    customer = create_random_customer(db)
    data = {
        "name": "Updated Name",
        "phone": random_phone(),
        "email": random_email(),
        "address": "456 Updated Ave",
    }
    response = client.put(
        f"{settings.API_V1_STR}/customers/{customer.id}",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["name"] == data["name"]
    assert content["phone"] == data["phone"]
    assert content["email"] == data["email"]
    assert content["address"] == data["address"]


def test_update_customer_not_found(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    data = {"name": "Updated Name"}
    response = client.put(
        f"{settings.API_V1_STR}/customers/{uuid.uuid4()}",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 404
    assert response.json()["detail"] == "Customer not found"


def test_update_customer_duplicate_phone(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    customer = create_random_customer(db)
    other_customer = create_random_customer(db)
    data = {"phone": other_customer.phone}
    response = client.put(
        f"{settings.API_V1_STR}/customers/{customer.id}",
        headers=superuser_token_headers,
        json=data,
    )
    assert response.status_code == 409
    assert response.json()["detail"] == "Phone number already registered"


def test_delete_customer(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    customer = create_random_customer(db)
    response = client.delete(
        f"{settings.API_V1_STR}/customers/{customer.id}",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    assert response.json()["message"] == "Customer deleted successfully"


def test_delete_customer_not_found(
    client: TestClient, superuser_token_headers: dict[str, str]
) -> None:
    response = client.delete(
        f"{settings.API_V1_STR}/customers/{uuid.uuid4()}",
        headers=superuser_token_headers,
    )
    assert response.status_code == 404
    assert response.json()["detail"] == "Customer not found"
