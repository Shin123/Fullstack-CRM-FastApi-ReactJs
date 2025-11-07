import random

from sqlmodel import Session

from app import crud
from app.models import Customer, CustomerCreate
from app.tests.utils.utils import random_email, random_lower_string


def random_phone() -> str:
    return "+1" + "".join(str(random.randint(0, 9)) for _ in range(10))


def create_random_customer(db: Session) -> Customer:
    customer_in = CustomerCreate(
        name=f"Customer {random_lower_string()}",
        phone=random_phone(),
        email=random_email(),
        address=f"{random_lower_string()} street",
    )
    return crud.create_customer(session=db, customer_in=customer_in)
