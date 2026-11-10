from datetime import datetime, date
from sqlalchemy import (
    Column,
    Integer,
    String,
    Numeric,
    Date,
    DateTime,
    Text,
    ForeignKey,
    Boolean,
    Enum as SqlEnum,
)
from sqlalchemy.orm import relationship
import enum

from .database import Base


class PersonEntryType(str, enum.Enum):
    DEMAND = "DEMAND"
    PAYOUT = "PAYOUT"


class PersonPaymentMode(str, enum.Enum):
    CASH = "CASH"
    CHEQUE = "CHEQUE"
    UPI = "UPI"
    BANK_TRANSFER = "BANK_TRANSFER"


class CompanyEntryType(str, enum.Enum):
    REQUISITION = "REQUISITION"
    RECEIVED = "RECEIVED"


class CompanyPaymentMode(str, enum.Enum):
    CASH = "CASH"
    CHEQUE = "CHEQUE"
    BANK_TRANSFER = "BANK_TRANSFER"


class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    STAFF = "STAFF"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    full_name = Column(String(200), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(SqlEnum(UserRole), default=UserRole.STAFF, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class Person(Base):
    __tablename__ = "persons"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    phone = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    entries = relationship(
        "PersonLedger",
        back_populates="person",
        cascade="all, delete-orphan",
        order_by="PersonLedger.entry_date.asc(), PersonLedger.id.asc()",
    )


class PersonLedger(Base):
    __tablename__ = "person_ledger"

    id = Column(Integer, primary_key=True, index=True)
    person_id = Column(
        Integer,
        ForeignKey("persons.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    entry_type = Column(SqlEnum(PersonEntryType), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    entry_date = Column(Date, nullable=False, index=True)
    bill_attachment_url = Column(String(500), nullable=True)
    payment_mode = Column(SqlEnum(PersonPaymentMode), nullable=True)
    reference_no = Column(String(100), nullable=True)
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    person = relationship("Person", back_populates="entries")


class CompanyLedger(Base):
    __tablename__ = "company_ledger"

    id = Column(Integer, primary_key=True, index=True)
    entry_type = Column(SqlEnum(CompanyEntryType), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    entry_date = Column(Date, nullable=False, index=True)
    payment_mode = Column(SqlEnum(CompanyPaymentMode), nullable=True)
    cheque_or_ref_no = Column(String(100), nullable=True)
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
