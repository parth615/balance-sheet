from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict
from .models import (
    PersonEntryType,
    PersonPaymentMode,
    CompanyEntryType,
    CompanyPaymentMode,
    UserRole,
)


class PersonBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    phone: Optional[str] = Field(None, max_length=50)


class PersonCreate(PersonBase):
    pass


class PersonSummary(PersonBase):
    id: int
    created_at: datetime
    total_demand_till_date: float = 0.0
    total_paid_till_date: float = 0.0
    net_balance: float = 0.0
    status_label: str = "Settled"

    model_config = ConfigDict(from_attributes=True)


class GrandTotals(BaseModel):
    total_demand_all: float = 0.0
    total_paid_all: float = 0.0
    net_balance_all: float = 0.0
    total_payable_market: float = 0.0
    total_advance_market: float = 0.0


class PersonsListResponse(BaseModel):
    items: List[PersonSummary]
    grand_totals: GrandTotals


class PersonLedgerEntryBase(BaseModel):
    entry_type: PersonEntryType
    amount: float = Field(..., gt=0, description="Amount must be positive")
    entry_date: date
    payment_mode: Optional[PersonPaymentMode] = None
    reference_no: Optional[str] = None
    remarks: Optional[str] = None


class PersonLedgerEntryResponse(PersonLedgerEntryBase):
    id: int
    person_id: int
    bill_attachment_url: Optional[str] = None
    created_at: datetime
    running_balance: float = 0.0

    model_config = ConfigDict(from_attributes=True)


class PersonTillDateSummary(BaseModel):
    total_demand: float
    total_paid: float
    net_balance: float
    status_label: str
    total_bills_count: int
    filtered_demand: float
    filtered_paid: float


class PersonLedgerDetailResponse(BaseModel):
    person: PersonSummary
    entries: List[PersonLedgerEntryResponse]
    till_date_summary: PersonTillDateSummary


class CompanyLedgerEntryBase(BaseModel):
    entry_type: CompanyEntryType
    amount: float = Field(..., gt=0, description="Amount must be positive")
    entry_date: date
    payment_mode: Optional[CompanyPaymentMode] = None
    cheque_or_ref_no: Optional[str] = None
    remarks: Optional[str] = None


class CompanyLedgerEntryCreate(CompanyLedgerEntryBase):
    pass


class CompanyLedgerEntryResponse(CompanyLedgerEntryBase):
    id: int
    created_at: datetime
    running_pending_balance: float = 0.0

    model_config = ConfigDict(from_attributes=True)


class CompanyTillDateTotals(BaseModel):
    total_demanded: float
    total_received: float
    pending_from_company: float
    cash_received_total: float
    cheque_received_total: float
    bank_received_total: float


class CompanyLedgerListResponse(BaseModel):
    entries: List[CompanyLedgerEntryResponse]
    till_date_totals: CompanyTillDateTotals


class DashboardSummary(BaseModel):
    total_market_demand: float
    total_paid_to_market: float
    market_net_balance: float
    total_payable_market: float
    total_advance_market: float

    total_demanded_from_company: float
    total_received_from_company: float
    cash_received: float
    cheque_received: float
    bank_received: float
    pending_from_company: float

    net_cash_in_hand: float


class UserLoginRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=100)
    password: str = Field(..., min_length=1, max_length=100)


class UserResponse(BaseModel):
    id: int
    username: str
    full_name: str
    role: UserRole
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserCreateRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=100)
    password: str = Field(..., min_length=4, max_length=100)
    full_name: str = Field(..., min_length=1, max_length=200)
    role: UserRole = UserRole.STAFF


class UserChangePasswordRequest(BaseModel):
    new_password: str = Field(..., min_length=4, max_length=100)


class UserStatusUpdateRequest(BaseModel):
    is_active: bool


class LoginResponse(BaseModel):
    token: str
    user: UserResponse
