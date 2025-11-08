import uuid
from decimal import Decimal

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from app.models import OrderStatus, PaymentStatus
from app.tests.utils.customer import create_random_customer
from app.tests.utils.product import create_random_product
from app.tests.utils.user import create_random_user


def _create_order_payload(
    customer_id: uuid.UUID, product_id: uuid.UUID, quantity: int = 2
) -> dict[str, object]:
    return {
        "customer_id": str(customer_id),
        "items": [{"product_id": str(product_id), "quantity": quantity}],
        "shipping_fee": "5.00",
        "tax_total": "2.50",
        "discount_total": "1.00",
        "notes": "Test order",
    }


def create_order_via_api(
    client: TestClient,
    superuser_token_headers: dict[str, str],
    customer_id: uuid.UUID,
    product_id: uuid.UUID,
) -> dict[str, object]:
    payload = _create_order_payload(customer_id, product_id)
    response = client.post(
        f"{settings.API_V1_STR}/orders/",
        headers=superuser_token_headers,
        json=payload,
    )
    assert response.status_code == 201
    return response.json()


def test_create_order(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    customer = create_random_customer(db)
    product = create_random_product(db)
    payload = _create_order_payload(customer.id, product.id, quantity=3)
    response = client.post(
        f"{settings.API_V1_STR}/orders/",
        headers=superuser_token_headers,
        json=payload,
    )
    assert response.status_code == 201
    content = response.json()
    assert content["customer_id"] == str(customer.id)
    assert content["status"] == OrderStatus.draft.value
    assert content["order_number"].startswith("ORD")
    assert len(content["items"]) == 1
    item = content["items"][0]
    assert item["product_id"] == str(product.id)
    assert item["quantity"] == 3
    unit_price = Decimal(str(product.price))
    expected_subtotal = unit_price * 3
    assert Decimal(content["subtotal"]) == expected_subtotal
    expected_grand_total = (
        expected_subtotal - Decimal("1.00") + Decimal("2.50") + Decimal("5.00")
    )
    assert Decimal(content["grand_total"]) == expected_grand_total


def test_create_order_requires_items(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    customer = create_random_customer(db)
    response = client.post(
        f"{settings.API_V1_STR}/orders/",
        headers=superuser_token_headers,
        json={
            "customer_id": str(customer.id),
            "items": [],
        },
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Order items required"


def test_read_orders(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    customer = create_random_customer(db)
    product = create_random_product(db)
    create_order_via_api(client, superuser_token_headers, customer.id, product.id)
    response = client.get(
        f"{settings.API_V1_STR}/orders/",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["count"] >= 1
    assert isinstance(content["data"], list)
    assert content["data"]


def test_read_order(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    customer = create_random_customer(db)
    product = create_random_product(db)
    created = create_order_via_api(
        client, superuser_token_headers, customer.id, product.id
    )
    response = client.get(
        f"{settings.API_V1_STR}/orders/{created['id']}",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["id"] == created["id"]
    assert content["order_number"] == created["order_number"]


def test_update_order(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    customer = create_random_customer(db)
    product = create_random_product(db)
    created = create_order_via_api(
        client, superuser_token_headers, customer.id, product.id
    )
    assignee = create_random_user(db)
    payload = {
        "status": OrderStatus.confirmed.value,
        "payment_status": PaymentStatus.pending.value,
        "assigned_to": str(assignee.id),
        "shipping_fee": "10.00",
        "tax_total": "3.00",
    }
    response = client.patch(
        f"{settings.API_V1_STR}/orders/{created['id']}",
        headers=superuser_token_headers,
        json=payload,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["status"] == payload["status"]
    assert content["payment_status"] == payload["payment_status"]
    assert content["assigned_to"] == payload["assigned_to"]
    assert Decimal(content["shipping_fee"]) == Decimal("10.00")
    assert Decimal(content["tax_total"]) == Decimal("3.00")


def test_delete_order(
    client: TestClient, superuser_token_headers: dict[str, str], db: Session
) -> None:
    customer = create_random_customer(db)
    product = create_random_product(db)
    created = create_order_via_api(
        client, superuser_token_headers, customer.id, product.id
    )
    response = client.delete(
        f"{settings.API_V1_STR}/orders/{created['id']}",
        headers=superuser_token_headers,
    )
    assert response.status_code == 200
    assert response.json()["message"] == "Order deleted successfully"
    get_response = client.get(
        f"{settings.API_V1_STR}/orders/{created['id']}",
        headers=superuser_token_headers,
    )
    assert get_response.status_code == 404
