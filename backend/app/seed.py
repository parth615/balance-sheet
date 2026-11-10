import os
from datetime import date, datetime, timedelta
from sqlalchemy.orm import Session
from .models import (
    Person,
    PersonLedger,
    CompanyLedger,
    PersonEntryType,
    PersonPaymentMode,
    CompanyEntryType,
    CompanyPaymentMode,
)

SAMPLE_INVOICE_SVG = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" width="100%" height="100%">
  <rect width="800" height="1000" fill="#f8fafc"/>
  <rect x="40" y="40" width="720" height="920" rx="16" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
  
  <!-- Header Banner -->
  <rect x="40" y="40" width="720" height="110" rx="16" fill="#1e293b"/>
  <text x="80" y="90" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="#ffffff">TAX INVOICE &amp; BILL</text>
  <text x="80" y="120" font-family="Arial, sans-serif" font-size="14" fill="#94a3b8">Original for Recipient | Commercial Supply Voucher</text>
  
  <text x="560" y="85" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#94a3b8">INVOICE NO:</text>
  <text x="560" y="110" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#38bdf8">INV-2026-0891</text>
  
  <!-- Vendor & Client Details -->
  <rect x="70" y="180" width="310" height="130" rx="8" fill="#f1f5f9"/>
  <text x="90" y="210" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#64748b">ISSUED BY (VENDOR):</text>
  <text x="90" y="235" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#0f172a">Ramesh Sharma Construction Supplies</text>
  <text x="90" y="260" font-family="Arial, sans-serif" font-size="13" fill="#334155">Plot 42, Industrial Area, Phase-2</text>
  <text x="90" y="280" font-family="Arial, sans-serif" font-size="13" fill="#334155">GSTIN: 07AAAAA0000A1Z5 | Ph: +91 98765 43210</text>

  <rect x="420" y="180" width="310" height="130" rx="8" fill="#f1f5f9"/>
  <text x="440" y="210" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#64748b">BILLED TO (SITE AGENT):</text>
  <text x="440" y="235" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#0f172a">Intermediary Site Management</text>
  <text x="440" y="260" font-family="Arial, sans-serif" font-size="13" fill="#334155">Metro Tower Project, Sector 62</text>
  <text x="440" y="280" font-family="Arial, sans-serif" font-size="13" fill="#334155">Date: 25 Oct 2026 | Delivery Challan: DC-4412</text>

  <!-- Items Table Header -->
  <rect x="70" y="340" width="660" height="40" rx="6" fill="#0284c7"/>
  <text x="90" y="365" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#ffffff">#</text>
  <text x="130" y="365" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#ffffff">DESCRIPTION OF GOODS</text>
  <text x="430" y="365" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#ffffff">QTY / UNIT</text>
  <text x="540" y="365" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#ffffff">RATE (₹)</text>
  <text x="640" y="365" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#ffffff">AMOUNT (₹)</text>

  <!-- Items Table Rows -->
  <text x="90" y="410" font-family="Arial, sans-serif" font-size="13" fill="#334155">1</text>
  <text x="130" y="410" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#1e293b">UltraTech Cement (50kg Bags)</text>
  <text x="430" y="410" font-family="Arial, sans-serif" font-size="13" fill="#334155">75 Bags</text>
  <text x="540" y="410" font-family="Arial, sans-serif" font-size="13" fill="#334155">₹380.00</text>
  <text x="640" y="410" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#0f172a">₹28,500.00</text>
  <line x1="70" y1="430" x2="730" y2="430" stroke="#f1f5f9" stroke-width="1.5"/>

  <text x="90" y="460" font-family="Arial, sans-serif" font-size="13" fill="#334155">2</text>
  <text x="130" y="460" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#1e293b">Coarse River Sand (Trolley Load)</text>
  <text x="430" y="460" font-family="Arial, sans-serif" font-size="13" fill="#334155">2 Loads</text>
  <text x="540" y="460" font-family="Arial, sans-serif" font-size="13" fill="#334155">₹6,000.00</text>
  <text x="640" y="460" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#0f172a">₹12,000.00</text>
  <line x1="70" y1="480" x2="730" y2="480" stroke="#f1f5f9" stroke-width="1.5"/>

  <text x="90" y="510" font-family="Arial, sans-serif" font-size="13" fill="#334155">3</text>
  <text x="130" y="510" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#1e293b">Unloading &amp; Freight Charges</text>
  <text x="430" y="510" font-family="Arial, sans-serif" font-size="13" fill="#334155">Lumpsum</text>
  <text x="540" y="510" font-family="Arial, sans-serif" font-size="13" fill="#334155">₹4,500.00</text>
  <text x="640" y="510" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#0f172a">₹4,500.00</text>
  <line x1="70" y1="535" x2="730" y2="535" stroke="#cbd5e1" stroke-width="2"/>

  <!-- Total Summary Box -->
  <rect x="420" y="560" width="310" height="120" rx="8" fill="#f8fafc" stroke="#e2e8f0"/>
  <text x="440" y="590" font-family="Arial, sans-serif" font-size="13" fill="#64748b">Sub Total:</text>
  <text x="640" y="590" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#0f172a">₹45,000.00</text>
  <text x="440" y="615" font-family="Arial, sans-serif" font-size="13" fill="#64748b">Tax / GST (Exempt/Included):</text>
  <text x="640" y="615" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#0f172a">₹0.00</text>
  <line x1="440" y1="630" x2="710" y2="630" stroke="#cbd5e1"/>
  <text x="440" y="660" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#0284c7">TOTAL DUE:</text>
  <text x="620" y="660" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#0284c7">₹45,000.00</text>

  <!-- Payment Notes & Stamp -->
  <rect x="70" y="560" width="310" height="120" rx="8" fill="#fefce8" stroke="#fef08a"/>
  <text x="90" y="590" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#854d0e">PAYMENT INSTRUCTIONS:</text>
  <text x="90" y="615" font-family="Arial, sans-serif" font-size="12" fill="#713f12">Please clear payment against this bill</text>
  <text x="90" y="635" font-family="Arial, sans-serif" font-size="12" fill="#713f12">Bank: HDFC Bank | A/c: 50200012345678</text>
  <text x="90" y="655" font-family="Arial, sans-serif" font-size="12" fill="#713f12">IFSC: HDFC0001234 | UPI: ramesh@hdfcbank</text>

  <!-- Authorized Sign Stamp -->
  <circle cx="620" cy="800" r="45" fill="none" stroke="#dc2626" stroke-width="2" stroke-dasharray="4,2"/>
  <text x="590" y="795" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="#dc2626">VERIFIED &amp;</text>
  <text x="590" y="810" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="#dc2626">SUBMITTED</text>
  <text x="580" y="865" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#64748b">Authorized Signatory</text>

  <text x="70" y="890" font-family="Arial, sans-serif" font-size="12" fill="#94a3b8">This is an authentic verified system bill generated for intermediary site accounting.</text>
</svg>"""

SAMPLE_BILL_2_SVG = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 900" width="100%" height="100%">
  <rect width="800" height="900" fill="#f8fafc"/>
  <rect x="40" y="40" width="720" height="820" rx="16" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
  <rect x="40" y="40" width="720" height="100" rx="16" fill="#047857"/>
  <text x="80" y="90" font-family="Arial, sans-serif" font-size="26" font-weight="bold" fill="#ffffff">ELECTRICAL WORKS INVOICE</text>
  <text x="80" y="115" font-family="Arial, sans-serif" font-size="14" fill="#a7f3d0">Suresh Patel Electricals &amp; Contractors</text>
  
  <text x="560" y="85" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#a7f3d0">BILL NO:</text>
  <text x="560" y="110" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#ffffff">SPE-2026-104</text>

  <rect x="70" y="160" width="660" height="80" rx="8" fill="#f0fdf4" stroke="#bbf7d0"/>
  <text x="90" y="190" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#166534">Contractor:</text>
  <text x="180" y="190" font-family="Arial, sans-serif" font-size="13" fill="#14532d">Suresh Patel (+91 98234 56789)</text>
  <text x="90" y="215" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#166534">Scope of Work:</text>
  <text x="180" y="215" font-family="Arial, sans-serif" font-size="13" fill="#14532d">Conduit Piping, DB Wiring &amp; Earth Pit Testing (Block B)</text>

  <!-- Items -->
  <rect x="70" y="260" width="660" height="40" rx="6" fill="#065f46"/>
  <text x="90" y="285" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#ffffff">PARTICULARS</text>
  <text x="520" y="285" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#ffffff">AMOUNT (₹)</text>

  <text x="90" y="330" font-family="Arial, sans-serif" font-size="14" fill="#1e293b">1. Polycab Copper Wires (4 sq mm &amp; 2.5 sq mm bundles)</text>
  <text x="540" y="330" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#0f172a">₹10,500.00</text>
  <line x1="70" y1="350" x2="730" y2="350" stroke="#f1f5f9"/>

  <text x="90" y="380" font-family="Arial, sans-serif" font-size="14" fill="#1e293b">2. Distribution Board (12-Way Legrand) + MCBs</text>
  <text x="540" y="380" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#0f172a">₹4,500.00</text>
  <line x1="70" y1="400" x2="730" y2="400" stroke="#f1f5f9"/>

  <text x="90" y="430" font-family="Arial, sans-serif" font-size="14" fill="#1e293b">3. Skilled Electrician Labor (3 days x 2 personnel)</text>
  <text x="540" y="430" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#0f172a">₹3,000.00</text>
  <line x1="70" y1="450" x2="730" y2="450" stroke="#065f46" stroke-width="2"/>

  <!-- Total -->
  <text x="360" y="490" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#1e293b">Total Billed Amount:</text>
  <text x="530" y="490" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#047857">₹18,000.00</text>

  <rect x="70" y="550" width="660" height="150" rx="8" fill="#f8fafc" stroke="#cbd5e1"/>
  <text x="90" y="585" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#334155">CERTIFICATE OF COMPLETION:</text>
  <text x="90" y="615" font-family="Arial, sans-serif" font-size="13" fill="#64748b">The materials listed above have been verified on site and installed according to specifications.</text>
  <text x="90" y="640" font-family="Arial, sans-serif" font-size="13" fill="#64748b">Inspection Date: 28 Oct 2026 | Approved by Site Engineer.</text>
  <text x="520" y="675" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#0f172a">Suresh Patel (Signature)</text>
</svg>"""


def ensure_seed_bills():
    uploads_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads", "bills")
    os.makedirs(uploads_dir, exist_ok=True)

    bill1_path = os.path.join(uploads_dir, "sample_bill_ramesh_cement.svg")
    if not os.path.exists(bill1_path):
        with open(bill1_path, "w", encoding="utf-8") as f:
            f.write(SAMPLE_INVOICE_SVG)

    bill2_path = os.path.join(uploads_dir, "sample_bill_suresh_electricals.svg")
    if not os.path.exists(bill2_path):
        with open(bill2_path, "w", encoding="utf-8") as f:
            f.write(SAMPLE_BILL_2_SVG)


def seed_database(db: Session, force: bool = False):
    ensure_seed_bills()

    existing_persons = db.query(Person).count()
    if existing_persons > 0 and not force:
        return

    # Clear existing if force
    if force:
        db.query(PersonLedger).delete()
        db.query(CompanyLedger).delete()
        db.query(Person).delete()
        db.commit()

    today = date.today()

    # 1. Person: Ramesh Sharma (Vendor - Cement & Materials)
    # Demand: 45,000 (with bill) + 25,000 = 70,000
    # Paid: 30,000 (UPI)
    # Net Balance = 30,000 - 70,000 = -40,000 (MINUS / Payable - Red)
    p1 = Person(name="Ramesh Sharma (Cement & Materials)", phone="+91 98765 43210")
    db.add(p1)
    db.flush()

    e1 = PersonLedger(
        person_id=p1.id,
        entry_type=PersonEntryType.DEMAND,
        amount=45000.00,
        entry_date=today - timedelta(days=12),
        bill_attachment_url="/uploads/bills/sample_bill_ramesh_cement.svg",
        remarks="Supply of 75 bags UltraTech Cement + Sand load for Block A foundation",
    )
    e2 = PersonLedger(
        person_id=p1.id,
        entry_type=PersonEntryType.PAYOUT,
        amount=30000.00,
        entry_date=today - timedelta(days=8),
        payment_mode=PersonPaymentMode.UPI,
        reference_no="UPI/261028491823/OKAXIS",
        remarks="Part payment made via Google Pay / UPI",
    )
    e3 = PersonLedger(
        person_id=p1.id,
        entry_type=PersonEntryType.DEMAND,
        amount=25000.00,
        entry_date=today - timedelta(days=3),
        bill_attachment_url=None,
        remarks="Secondary delivery of 50 bags Birla A1 cement (physical challan handed over)",
    )
    db.add_all([e1, e2, e3])

    # 2. Person: Suresh Patel (Vendor - Electrical Contractor)
    # Demand: 18,000
    # Paid: 25,000 (Cheque)
    # Net Balance = 25,000 - 18,000 = +7,000 (PLUS / Extra Advance Paid - Green)
    p2 = Person(name="Suresh Patel (Electrical Contractor)", phone="+91 98234 56789")
    db.add(p2)
    db.flush()

    e4 = PersonLedger(
        person_id=p2.id,
        entry_type=PersonEntryType.DEMAND,
        amount=18000.00,
        entry_date=today - timedelta(days=10),
        bill_attachment_url="/uploads/bills/sample_bill_suresh_electricals.svg",
        remarks="Conduit wiring and DB installation bill SPE-2026-104",
    )
    e5 = PersonLedger(
        person_id=p2.id,
        entry_type=PersonEntryType.PAYOUT,
        amount=25000.00,
        entry_date=today - timedelta(days=5),
        payment_mode=PersonPaymentMode.CHEQUE,
        reference_no="CHQ-448102",
        remarks="Cheque issued including ₹7,000 advance mobilization fee for Block C",
    )
    db.add_all([e4, e5])

    # 3. Person: Mohan Lal (Vendor - Transport & Logistics)
    # Demand: 12,500
    # Paid: 12,500
    # Net Balance = 0 (Settled - Grey)
    p3 = Person(name="Mohan Lal (Transport & Logistics)", phone="+91 97112 33445")
    db.add(p3)
    db.flush()

    e6 = PersonLedger(
        person_id=p3.id,
        entry_type=PersonEntryType.DEMAND,
        amount=12500.00,
        entry_date=today - timedelta(days=7),
        bill_attachment_url=None,
        remarks="Freight charges for 4 trips from warehouse to project site",
    )
    e7 = PersonLedger(
        person_id=p3.id,
        entry_type=PersonEntryType.PAYOUT,
        amount=12500.00,
        entry_date=today - timedelta(days=2),
        payment_mode=PersonPaymentMode.BANK_TRANSFER,
        reference_no="NEFT-HDFC261099231",
        remarks="Full & final settlement via NEFT bank transfer",
    )
    db.add_all([e6, e7])

    # 4. Company Ledger (Funding Source)
    # Requisition 1: 80,000 (Demand for site materials)
    # Received 1: 50,000 (Cheque: CHQ-882194)
    # Requisition 2: 30,000 (Additional emergency fund requisition)
    # Received 2: 40,000 (Bank Transfer: UTR-994821)
    # Received 3: 10,000 (Cash received from head office cashier)
    # Total Demanded from Company = 110,000
    # Total Received from Company = 100,000 (Cash: 10,000 | Cheque: 50,000 | Bank: 40,000)
    # Market Demand Total = 70,000 + 18,000 + 12,500 = 100,500
    # Market Paid Total = 30,000 + 25,000 + 12,500 = 67,500
    # Net Market Balance = 67,500 - 100,500 = -33,000 (Payable)
    # Net Cash in Hand = Total Received (100,000) - Total Paid to Market (67,500) = +32,500
    c1 = CompanyLedger(
        entry_type=CompanyEntryType.REQUISITION,
        amount=80000.00,
        entry_date=today - timedelta(days=14),
        remarks="Monthly site advance requisition for raw materials and vendor advances",
    )
    c2 = CompanyLedger(
        entry_type=CompanyEntryType.RECEIVED,
        amount=50000.00,
        entry_date=today - timedelta(days=12),
        payment_mode=CompanyPaymentMode.CHEQUE,
        cheque_or_ref_no="CHQ-882194",
        remarks="Company released first tranche via Axis Bank cheque",
    )
    c3 = CompanyLedger(
        entry_type=CompanyEntryType.REQUISITION,
        amount=30000.00,
        entry_date=today - timedelta(days=9),
        remarks="Requisition for electrical cabling and transport settlement",
    )
    c4 = CompanyLedger(
        entry_type=CompanyEntryType.RECEIVED,
        amount=40000.00,
        entry_date=today - timedelta(days=6),
        payment_mode=CompanyPaymentMode.BANK_TRANSFER,
        cheque_or_ref_no="UTR-ICICI99482133",
        remarks="RTGS credit received directly into site operating account",
    )
    c5 = CompanyLedger(
        entry_type=CompanyEntryType.RECEIVED,
        amount=10000.00,
        entry_date=today - timedelta(days=4),
        payment_mode=CompanyPaymentMode.CASH,
        cheque_or_ref_no="PETTY-VCH-882",
        remarks="Petty cash collected from corporate head office cashier",
    )
    db.add_all([c1, c2, c3, c4, c5])

    db.commit()
