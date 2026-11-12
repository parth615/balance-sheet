import os
import shutil
import uuid
from datetime import date, datetime
from typing import Optional, List
from pathlib import Path

from fastapi import (
    FastAPI,
    Depends,
    HTTPException,
    UploadFile,
    File,
    Form,
    Query,
    status,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy import func, inspect, text

from .database import engine, Base, get_db
from .models import (
    Person,
    PersonLedger,
    CompanyLedger,
    PersonEntryType,
    PersonPaymentMode,
    CompanyEntryType,
    CompanyPaymentMode,
    User,
    UserRole,
)
from .schemas import (
    PersonCreate,
    PersonSummary,
    PersonsListResponse,
    GrandTotals,
    PersonLedgerEntryResponse,
    PersonTillDateSummary,
    PersonLedgerDetailResponse,
    CompanyLedgerEntryCreate,
    CompanyLedgerEntryResponse,
    CompanyTillDateTotals,
    CompanyLedgerListResponse,
    DashboardSummary,
    UserLoginRequest,
    UserResponse,
    UserCreateRequest,
    UserChangePasswordRequest,
    UserStatusUpdateRequest,
    LoginResponse,
)
from .auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    require_admin,
    ensure_default_admin,
)
from .seed import seed_database

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="3-Way Intermediary Balance Sheet & Ledger API",
    version="1.0.0",
    description="Backend API for 3-Way Intermediary Balance Sheet tracking Vendors, Company Funding, and Intermediary Float",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Setup uploads directory
BASE_DIR = Path(__file__).resolve().parent.parent
UPLOADS_DIR = BASE_DIR / "uploads"
BILLS_DIR = UPLOADS_DIR / "bills"
BILLS_DIR.mkdir(parents=True, exist_ok=True)

# Mount static uploads
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")


def ensure_owner_id_columns(db: Session):
    """Safely adds owner_id column to existing tables and assigns legacy rows to default admin."""
    inspector = inspect(engine)
    for table_name in ("persons", "company_ledger"):
        if table_name in inspector.get_table_names():
            cols = {c["name"] for c in inspector.get_columns(table_name)}
            if "owner_id" not in cols:
                db.execute(text(f"ALTER TABLE {table_name} ADD COLUMN owner_id INTEGER"))
                db.commit()

    # Assign any legacy rows with NULL owner_id to the primary admin
    admin_user = db.query(User).filter(User.role == UserRole.ADMIN).order_by(User.id.asc()).first()
    if admin_user:
        db.query(Person).filter(Person.owner_id.is_(None)).update(
            {"owner_id": admin_user.id}, synchronize_session=False
        )
        db.query(CompanyLedger).filter(CompanyLedger.owner_id.is_(None)).update(
            {"owner_id": admin_user.id}, synchronize_session=False
        )
        db.commit()


@app.on_event("startup")
def on_startup():
    db = next(get_db())
    try:
        ensure_default_admin(db)
        ensure_owner_id_columns(db)
    finally:
        db.close()


def get_status_label(net_balance: float) -> str:
    if net_balance < -0.001:
        return "Payable (Aur dene hain)"
    elif net_balance > 0.001:
        return "Extra / Advance Paid"
    return "Settled"


# ==========================================
# 1. Dashboard Summary (Scoped to Current User)
# ==========================================
@app.get("/api/dashboard/summary", response_model=DashboardSummary)
def get_dashboard_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # 1. Total Market Demand (Current User's Persons DEMAND entries)
    market_demand = (
        db.query(func.coalesce(func.sum(PersonLedger.amount), 0.0))
        .join(Person, PersonLedger.person_id == Person.id)
        .filter(
            Person.owner_id == current_user.id,
            PersonLedger.entry_type == PersonEntryType.DEMAND,
        )
        .scalar()
    ) or 0.0

    # 2. Total Paid to Market (Current User's Persons PAYOUT entries)
    market_paid = (
        db.query(func.coalesce(func.sum(PersonLedger.amount), 0.0))
        .join(Person, PersonLedger.person_id == Person.id)
        .filter(
            Person.owner_id == current_user.id,
            PersonLedger.entry_type == PersonEntryType.PAYOUT,
        )
        .scalar()
    ) or 0.0

    market_net_balance = float(market_paid) - float(market_demand)

    # Calculate payable vs advance per person
    persons = db.query(Person).filter(Person.owner_id == current_user.id).all()
    total_payable_market = 0.0
    total_advance_market = 0.0

    for p in persons:
        p_demand = (
            db.query(func.coalesce(func.sum(PersonLedger.amount), 0.0))
            .filter(
                PersonLedger.person_id == p.id,
                PersonLedger.entry_type == PersonEntryType.DEMAND,
            )
            .scalar()
        ) or 0.0
        p_paid = (
            db.query(func.coalesce(func.sum(PersonLedger.amount), 0.0))
            .filter(
                PersonLedger.person_id == p.id,
                PersonLedger.entry_type == PersonEntryType.PAYOUT,
            )
            .scalar()
        ) or 0.0
        p_net = float(p_paid) - float(p_demand)
        if p_net < -0.001:
            total_payable_market += abs(p_net)
        elif p_net > 0.001:
            total_advance_market += p_net

    # 3. Company Requisition (Demanded)
    company_demanded = (
        db.query(func.coalesce(func.sum(CompanyLedger.amount), 0.0))
        .filter(
            CompanyLedger.owner_id == current_user.id,
            CompanyLedger.entry_type == CompanyEntryType.REQUISITION,
        )
        .scalar()
    ) or 0.0

    # 4. Company Received
    company_received = (
        db.query(func.coalesce(func.sum(CompanyLedger.amount), 0.0))
        .filter(
            CompanyLedger.owner_id == current_user.id,
            CompanyLedger.entry_type == CompanyEntryType.RECEIVED,
        )
        .scalar()
    ) or 0.0

    cash_received = (
        db.query(func.coalesce(func.sum(CompanyLedger.amount), 0.0))
        .filter(
            CompanyLedger.owner_id == current_user.id,
            CompanyLedger.entry_type == CompanyEntryType.RECEIVED,
            CompanyLedger.payment_mode == CompanyPaymentMode.CASH,
        )
        .scalar()
    ) or 0.0

    cheque_received = (
        db.query(func.coalesce(func.sum(CompanyLedger.amount), 0.0))
        .filter(
            CompanyLedger.owner_id == current_user.id,
            CompanyLedger.entry_type == CompanyEntryType.RECEIVED,
            CompanyLedger.payment_mode == CompanyPaymentMode.CHEQUE,
        )
        .scalar()
    ) or 0.0

    bank_received = (
        db.query(func.coalesce(func.sum(CompanyLedger.amount), 0.0))
        .filter(
            CompanyLedger.owner_id == current_user.id,
            CompanyLedger.entry_type == CompanyEntryType.RECEIVED,
            CompanyLedger.payment_mode == CompanyPaymentMode.BANK_TRANSFER,
        )
        .scalar()
    ) or 0.0

    pending_from_company = float(company_demanded) - float(company_received)

    # 5. Net Cash in Hand (Available Float) = Total Received from Company - Total Paid to Market (All Persons)
    net_cash_in_hand = float(company_received) - float(market_paid)

    return DashboardSummary(
        total_market_demand=round(float(market_demand), 2),
        total_paid_to_market=round(float(market_paid), 2),
        market_net_balance=round(market_net_balance, 2),
        total_payable_market=round(total_payable_market, 2),
        total_advance_market=round(total_advance_market, 2),
        total_demanded_from_company=round(float(company_demanded), 2),
        total_received_from_company=round(float(company_received), 2),
        cash_received=round(float(cash_received), 2),
        cheque_received=round(float(cheque_received), 2),
        bank_received=round(float(bank_received), 2),
        pending_from_company=round(pending_from_company, 2),
        net_cash_in_hand=round(net_cash_in_hand, 2),
    )


# ==========================================
# 2. Persons API (Scoped to Current User)
# ==========================================
@app.get("/api/persons", response_model=PersonsListResponse)
def get_persons(
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Person).filter(Person.owner_id == current_user.id)
    if search:
        query = query.filter(Person.name.ilike(f"%{search.strip()}%"))

    persons = query.order_by(Person.name.asc()).all()

    items: List[PersonSummary] = []
    tot_demand = 0.0
    tot_paid = 0.0
    tot_payable = 0.0
    tot_advance = 0.0

    for p in persons:
        p_demand = (
            db.query(func.coalesce(func.sum(PersonLedger.amount), 0.0))
            .filter(
                PersonLedger.person_id == p.id,
                PersonLedger.entry_type == PersonEntryType.DEMAND,
            )
            .scalar()
        ) or 0.0
        p_paid = (
            db.query(func.coalesce(func.sum(PersonLedger.amount), 0.0))
            .filter(
                PersonLedger.person_id == p.id,
                PersonLedger.entry_type == PersonEntryType.PAYOUT,
            )
            .scalar()
        ) or 0.0

        p_demand_f = float(p_demand)
        p_paid_f = float(p_paid)
        net_bal = p_paid_f - p_demand_f

        tot_demand += p_demand_f
        tot_paid += p_paid_f
        if net_bal < -0.001:
            tot_payable += abs(net_bal)
        elif net_bal > 0.001:
            tot_advance += net_bal

        items.append(
            PersonSummary(
                id=p.id,
                name=p.name,
                phone=p.phone,
                created_at=p.created_at,
                total_demand_till_date=round(p_demand_f, 2),
                total_paid_till_date=round(p_paid_f, 2),
                net_balance=round(net_bal, 2),
                status_label=get_status_label(net_bal),
            )
        )

    grand_totals = GrandTotals(
        total_demand_all=round(tot_demand, 2),
        total_paid_all=round(tot_paid, 2),
        net_balance_all=round(tot_paid - tot_demand, 2),
        total_payable_market=round(tot_payable, 2),
        total_advance_market=round(tot_advance, 2),
    )

    return PersonsListResponse(items=items, grand_totals=grand_totals)


@app.post("/api/persons", response_model=PersonSummary, status_code=status.HTTP_201_CREATED)
def create_person(
    payload: PersonCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    trimmed_name = payload.name.strip()
    if not trimmed_name:
        raise HTTPException(status_code=400, detail="Person name cannot be empty")

    person = Person(
        owner_id=current_user.id,
        name=trimmed_name,
        phone=payload.phone.strip() if payload.phone else None,
        created_at=datetime.utcnow(),
    )
    db.add(person)
    db.commit()
    db.refresh(person)

    return PersonSummary(
        id=person.id,
        name=person.name,
        phone=person.phone,
        created_at=person.created_at,
        total_demand_till_date=0.0,
        total_paid_till_date=0.0,
        net_balance=0.0,
        status_label="Settled",
    )


# ==========================================
# 3. Person Ledger Details & Entries
# ==========================================
@app.get("/api/persons/{person_id}/ledger", response_model=PersonLedgerDetailResponse)
def get_person_ledger(
    person_id: int,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    person = (
        db.query(Person)
        .filter(Person.id == person_id, Person.owner_id == current_user.id)
        .first()
    )
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")

    # Fetch ALL entries for accurate running balances and till-date totals
    all_entries = (
        db.query(PersonLedger)
        .filter(PersonLedger.person_id == person_id)
        .order_by(PersonLedger.entry_date.asc(), PersonLedger.id.asc())
        .all()
    )

    running_bal = 0.0
    tot_demand_till_date = 0.0
    tot_paid_till_date = 0.0
    total_bills_count = 0

    enriched_entries: List[PersonLedgerEntryResponse] = []

    for entry in all_entries:
        amt = float(entry.amount)
        if entry.entry_type == PersonEntryType.DEMAND:
            running_bal -= amt
            tot_demand_till_date += amt
            if entry.bill_attachment_url:
                total_bills_count += 1
        elif entry.entry_type == PersonEntryType.PAYOUT:
            running_bal += amt
            tot_paid_till_date += amt

        # Check date filter
        date_matches = True
        if start_date and entry.entry_date < start_date:
            date_matches = False
        if end_date and entry.entry_date > end_date:
            date_matches = False

        if date_matches:
            enriched_entries.append(
                PersonLedgerEntryResponse(
                    id=entry.id,
                    person_id=entry.person_id,
                    entry_type=entry.entry_type,
                    amount=round(amt, 2),
                    entry_date=entry.entry_date,
                    bill_attachment_url=entry.bill_attachment_url,
                    payment_mode=entry.payment_mode,
                    reference_no=entry.reference_no,
                    remarks=entry.remarks,
                    created_at=entry.created_at,
                    running_balance=round(running_bal, 2),
                )
            )

    net_bal = tot_paid_till_date - tot_demand_till_date

    filtered_demand = sum(
        e.amount for e in enriched_entries if e.entry_type == PersonEntryType.DEMAND
    )
    filtered_paid = sum(
        e.amount for e in enriched_entries if e.entry_type == PersonEntryType.PAYOUT
    )

    person_summary = PersonSummary(
        id=person.id,
        name=person.name,
        phone=person.phone,
        created_at=person.created_at,
        total_demand_till_date=round(tot_demand_till_date, 2),
        total_paid_till_date=round(tot_paid_till_date, 2),
        net_balance=round(net_bal, 2),
        status_label=get_status_label(net_bal),
    )

    till_date_summary = PersonTillDateSummary(
        total_demand=round(tot_demand_till_date, 2),
        total_paid=round(tot_paid_till_date, 2),
        net_balance=round(net_bal, 2),
        status_label=get_status_label(net_bal),
        total_bills_count=total_bills_count,
        filtered_demand=round(filtered_demand, 2),
        filtered_paid=round(filtered_paid, 2),
    )

    return PersonLedgerDetailResponse(
        person=person_summary,
        entries=enriched_entries,
        till_date_summary=till_date_summary,
    )


@app.post(
    "/api/persons/{person_id}/entries",
    response_model=PersonLedgerEntryResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_person_ledger_entry(
    person_id: int,
    entry_type: PersonEntryType = Form(...),
    amount: float = Form(...),
    entry_date: date = Form(...),
    payment_mode: Optional[PersonPaymentMode] = Form(None),
    reference_no: Optional[str] = Form(None),
    remarks: Optional[str] = Form(None),
    bill_file: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    person = (
        db.query(Person)
        .filter(Person.id == person_id, Person.owner_id == current_user.id)
        .first()
    )
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")

    if amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than 0")

    attachment_url: Optional[str] = None
    if bill_file and bill_file.filename:
        # Validate extension
        ext = os.path.splitext(bill_file.filename)[1].lower()
        allowed_exts = {".jpg", ".jpeg", ".png", ".webp", ".pdf", ".svg"}
        if ext not in allowed_exts:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file extension {ext}. Allowed: JPG, PNG, WEBP, PDF, SVG",
            )

        safe_filename = f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}{ext}"
        target_path = BILLS_DIR / safe_filename

        with open(target_path, "wb") as buffer:
            shutil.copyfileobj(bill_file.file, buffer)

        attachment_url = f"/uploads/bills/{safe_filename}"

    entry = PersonLedger(
        person_id=person_id,
        entry_type=entry_type,
        amount=amount,
        entry_date=entry_date,
        bill_attachment_url=attachment_url,
        payment_mode=payment_mode if entry_type == PersonEntryType.PAYOUT else None,
        reference_no=reference_no.strip() if reference_no else None,
        remarks=remarks.strip() if remarks else None,
        created_at=datetime.utcnow(),
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)

    # Calculate current running balance
    all_prior_entries = (
        db.query(PersonLedger)
        .filter(PersonLedger.person_id == person_id)
        .order_by(PersonLedger.entry_date.asc(), PersonLedger.id.asc())
        .all()
    )
    cur_bal = 0.0
    for e in all_prior_entries:
        if e.entry_type == PersonEntryType.DEMAND:
            cur_bal -= float(e.amount)
        else:
            cur_bal += float(e.amount)
        if e.id == entry.id:
            break

    return PersonLedgerEntryResponse(
        id=entry.id,
        person_id=entry.person_id,
        entry_type=entry.entry_type,
        amount=round(float(entry.amount), 2),
        entry_date=entry.entry_date,
        bill_attachment_url=entry.bill_attachment_url,
        payment_mode=entry.payment_mode,
        reference_no=entry.reference_no,
        remarks=entry.remarks,
        created_at=entry.created_at,
        running_balance=round(cur_bal, 2),
    )


@app.delete("/api/persons/entries/{entry_id}", status_code=status.HTTP_200_OK)
def delete_person_entry(
    entry_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    entry = (
        db.query(PersonLedger)
        .join(Person, PersonLedger.person_id == Person.id)
        .filter(PersonLedger.id == entry_id, Person.owner_id == current_user.id)
        .first()
    )
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")

    # If has bill file uploaded locally, optionally remove
    if entry.bill_attachment_url and entry.bill_attachment_url.startswith("/uploads/bills/"):
        file_path = BASE_DIR / entry.bill_attachment_url.lstrip("/")
        if file_path.exists() and "sample_bill" not in file_path.name:
            try:
                file_path.unlink()
            except Exception:
                pass

    db.delete(entry)
    db.commit()
    return {"message": "Person ledger entry deleted successfully"}


# ==========================================
# 4. Company Ledger API (Scoped to Current User)
# ==========================================
@app.get("/api/company/ledger", response_model=CompanyLedgerListResponse)
def get_company_ledger(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    all_entries = (
        db.query(CompanyLedger)
        .filter(CompanyLedger.owner_id == current_user.id)
        .order_by(CompanyLedger.entry_date.asc(), CompanyLedger.id.asc())
        .all()
    )

    running_pending = 0.0
    tot_demanded = 0.0
    tot_received = 0.0
    cash_total = 0.0
    cheque_total = 0.0
    bank_total = 0.0

    enriched_entries: List[CompanyLedgerEntryResponse] = []

    for entry in all_entries:
        amt = float(entry.amount)
        if entry.entry_type == CompanyEntryType.REQUISITION:
            running_pending += amt
            tot_demanded += amt
        elif entry.entry_type == CompanyEntryType.RECEIVED:
            running_pending -= amt
            tot_received += amt
            if entry.payment_mode == CompanyPaymentMode.CASH:
                cash_total += amt
            elif entry.payment_mode == CompanyPaymentMode.CHEQUE:
                cheque_total += amt
            elif entry.payment_mode == CompanyPaymentMode.BANK_TRANSFER:
                bank_total += amt

        # Date filter
        date_matches = True
        if start_date and entry.entry_date < start_date:
            date_matches = False
        if end_date and entry.entry_date > end_date:
            date_matches = False

        if date_matches:
            enriched_entries.append(
                CompanyLedgerEntryResponse(
                    id=entry.id,
                    entry_type=entry.entry_type,
                    amount=round(amt, 2),
                    entry_date=entry.entry_date,
                    payment_mode=entry.payment_mode,
                    cheque_or_ref_no=entry.cheque_or_ref_no,
                    remarks=entry.remarks,
                    created_at=entry.created_at,
                    running_pending_balance=round(running_pending, 2),
                )
            )

    till_date_totals = CompanyTillDateTotals(
        total_demanded=round(tot_demanded, 2),
        total_received=round(tot_received, 2),
        pending_from_company=round(tot_demanded - tot_received, 2),
        cash_received_total=round(cash_total, 2),
        cheque_received_total=round(cheque_total, 2),
        bank_received_total=round(bank_total, 2),
    )

    return CompanyLedgerListResponse(
        entries=enriched_entries,
        till_date_totals=till_date_totals,
    )


@app.post(
    "/api/company/entries",
    response_model=CompanyLedgerEntryResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_company_ledger_entry(
    payload: CompanyLedgerEntryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than 0")

    if payload.entry_type == CompanyEntryType.RECEIVED and not payload.payment_mode:
        raise HTTPException(
            status_code=400,
            detail="Payment mode (CASH, CHEQUE, BANK_TRANSFER) is required when recording received money",
        )

    entry = CompanyLedger(
        owner_id=current_user.id,
        entry_type=payload.entry_type,
        amount=payload.amount,
        entry_date=payload.entry_date,
        payment_mode=payload.payment_mode if payload.entry_type == CompanyEntryType.RECEIVED else None,
        cheque_or_ref_no=payload.cheque_or_ref_no.strip() if payload.cheque_or_ref_no else None,
        remarks=payload.remarks.strip() if payload.remarks else None,
        created_at=datetime.utcnow(),
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)

    # Compute running pending balance (for current user)
    all_prior = (
        db.query(CompanyLedger)
        .filter(CompanyLedger.owner_id == current_user.id)
        .order_by(CompanyLedger.entry_date.asc(), CompanyLedger.id.asc())
        .all()
    )
    cur_pending = 0.0
    for e in all_prior:
        if e.entry_type == CompanyEntryType.REQUISITION:
            cur_pending += float(e.amount)
        else:
            cur_pending -= float(e.amount)
        if e.id == entry.id:
            break

    return CompanyLedgerEntryResponse(
        id=entry.id,
        entry_type=entry.entry_type,
        amount=round(float(entry.amount), 2),
        entry_date=entry.entry_date,
        payment_mode=entry.payment_mode,
        cheque_or_ref_no=entry.cheque_or_ref_no,
        remarks=entry.remarks,
        created_at=entry.created_at,
        running_pending_balance=round(cur_pending, 2),
    )


@app.delete("/api/persons/{person_id}", status_code=status.HTTP_200_OK)
def delete_person(
    person_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    person = (
        db.query(Person)
        .filter(Person.id == person_id, Person.owner_id == current_user.id)
        .first()
    )
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")
    db.delete(person)
    db.commit()
    return {"message": f"Person '{person.name}' and all associated ledger entries deleted successfully"}


@app.delete("/api/company/entries/{entry_id}", status_code=status.HTTP_200_OK)
def delete_company_entry(
    entry_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    entry = (
        db.query(CompanyLedger)
        .filter(CompanyLedger.id == entry_id, CompanyLedger.owner_id == current_user.id)
        .first()
    )
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")

    db.delete(entry)
    db.commit()
    return {"message": "Company ledger entry deleted successfully"}


@app.post("/api/clear-all", status_code=status.HTTP_200_OK)
def clear_all_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Removes all parties and entries belonging to the current user for a fresh empty ledger."""
    person_ids = [
        pid for (pid,) in db.query(Person.id).filter(Person.owner_id == current_user.id).all()
    ]
    if person_ids:
        db.query(PersonLedger).filter(PersonLedger.person_id.in_(person_ids)).delete(
            synchronize_session=False
        )
    db.query(CompanyLedger).filter(CompanyLedger.owner_id == current_user.id).delete(
        synchronize_session=False
    )
    db.query(Person).filter(Person.owner_id == current_user.id).delete(
        synchronize_session=False
    )
    db.commit()
    return {"message": "Your private ledger data removed successfully. Ledger is now fresh and empty."}


@app.post("/api/reset-seed", status_code=status.HTTP_200_OK)
def reset_seed(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    seed_database(db, force=True, owner_id=current_user.id)
    return {"message": "Your private ledger reset to sample state successfully"}


# ==========================================
# 6. Authentication & User Management (Admin RBAC)
# ==========================================

@app.post("/api/auth/login", response_model=LoginResponse)
def login(payload: UserLoginRequest, db: Session = Depends(get_db)):
    user = (
        db.query(User)
        .filter(User.username == payload.username.strip().lower())
        .first()
    )
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Username/ID or Password. Please check your credentials.",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated. Please contact your Admin.",
        )

    token = create_access_token(user.id, user.username, user.role.value)
    return LoginResponse(
        token=token,
        user=UserResponse(
            id=user.id,
            username=user.username,
            full_name=user.full_name,
            role=user.role,
            is_active=user.is_active,
            created_at=user.created_at,
        ),
    )


@app.get("/api/auth/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    return UserResponse(
        id=current_user.id,
        username=current_user.username,
        full_name=current_user.full_name,
        role=current_user.role,
        is_active=current_user.is_active,
        created_at=current_user.created_at,
    )


@app.put("/api/auth/password", status_code=status.HTTP_200_OK)
def update_own_password(
    payload: UserChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if len(payload.new_password.strip()) < 4:
        raise HTTPException(status_code=400, detail="Password must be at least 4 characters long")

    current_user.hashed_password = hash_password(payload.new_password.strip())
    db.commit()
    return {"message": "Password updated successfully"}


# --- Admin User Management Endpoints ---

@app.get("/api/users", response_model=List[UserResponse])
def list_users(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    users = db.query(User).order_by(User.id.asc()).all()
    return [
        UserResponse(
            id=u.id,
            username=u.username,
            full_name=u.full_name,
            role=u.role,
            is_active=u.is_active,
            created_at=u.created_at,
        )
        for u in users
    ]


@app.post("/api/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_new_user(
    payload: UserCreateRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    clean_username = payload.username.strip().lower()
    if not clean_username:
        raise HTTPException(status_code=400, detail="Username cannot be empty")
    if len(payload.password.strip()) < 4:
        raise HTTPException(status_code=400, detail="Password must be at least 4 characters long")

    existing = db.query(User).filter(User.username == clean_username).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"User ID / Username '{clean_username}' already exists. Please choose a different one.",
        )

    new_user = User(
        username=clean_username,
        full_name=payload.full_name.strip(),
        hashed_password=hash_password(payload.password.strip()),
        role=payload.role,
        is_active=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return UserResponse(
        id=new_user.id,
        username=new_user.username,
        full_name=new_user.full_name,
        role=new_user.role,
        is_active=new_user.is_active,
        created_at=new_user.created_at,
    )


@app.put("/api/users/{user_id}/status", response_model=UserResponse)
def update_user_status(
    user_id: int,
    payload: UserStatusUpdateRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == admin.id and not payload.is_active:
        raise HTTPException(status_code=400, detail="You cannot deactivate your own admin account")

    user.is_active = payload.is_active
    db.commit()
    db.refresh(user)
    return UserResponse(
        id=user.id,
        username=user.username,
        full_name=user.full_name,
        role=user.role,
        is_active=user.is_active,
        created_at=user.created_at,
    )


@app.put("/api/users/{user_id}/password", status_code=status.HTTP_200_OK)
def admin_reset_user_password(
    user_id: int,
    payload: UserChangePasswordRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if len(payload.new_password.strip()) < 4:
        raise HTTPException(status_code=400, detail="Password must be at least 4 characters long")

    user.hashed_password = hash_password(payload.new_password.strip())
    db.commit()
    return {"message": f"Password for user '{user.username}' has been updated successfully"}


@app.delete("/api/users/{user_id}", status_code=status.HTTP_200_OK)
def delete_user(
    user_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="You cannot delete your own admin account")

    db.delete(user)
    db.commit()
    return {"message": f"User '{user.username}' deleted successfully"}
