# 3-Way Intermediary Balance Sheet & Ledger Management

A complete, production-ready Full-Stack 3-Way Financial Intermediary Balance Sheet web application built with **FastAPI (Python)**, **SQLAlchemy**, and **Next.js 16 (React 19, TypeScript, Tailwind CSS, Lucide Icons)**.

---

## 1. Core Architecture & Exact Math Logic

The system accurately tracks money flow across three interconnected financial entities:
1. **Persons / Vendors (Payables):** Contractors, material suppliers, and service providers who submit bills/demands and receive payouts.
2. **Company (Funding Source):** The financing entity from which funds are demanded (requisitions) and payouts are received (via Cash, Cheque, or Bank Transfer).
3. **Intermediary Cash Float (Pocket Balance):** Available cash-in-hand held by the intermediary agent.

### Strict Sign & Mathematical Formulas (Never Inverted)
- **Per-Person Till-Date Metrics:**
  - `Total Demand (Till Date)` = Sum of all `DEMAND` entries for that person.
  - `Total Paid (Till Date)` = Sum of all `PAYOUT` entries given to that person.
  - `Net Balance` = `Total Paid (Till Date) - Total Demand (Till Date)`
    - **`Net Balance < 0` (MINUS / Red):** Label: `"Payable (Aur dene hain)"` (e.g. `-₹40,000`).
    - **`Net Balance > 0` (PLUS / Green):** Label: `"Extra / Advance Paid"` (e.g. `+₹7,000`).
    - **`Net Balance == 0` (GREY):** Label: `"Settled"` (e.g. `₹0`).
- **Top 6 Master Dashboard KPIs (Till Date):**
  1. `Total Market Demand (All Persons)` = Sum of all persons' `DEMAND` entries.
  2. `Total Paid to Market (All Persons)` = Sum of all persons' `PAYOUT` entries.
  3. `Market Net Balance` = `Total Paid to Market - Total Market Demand` (with breakdown: Total Payable vs Total Advance Paid).
  4. `Total Demanded from Company` = Sum of all company `REQUISITION` entries.
  5. `Total Received from Company` = Sum of all company `RECEIVED` entries (breakdown: Cash, Cheque, Bank Transfer).
  6. `Net Cash in Hand (Available Float)` = `Total Received from Company - Total Paid to Market (All Persons)`.

---

## 2. Project Structure

```
khatabook-intermediary-ledger/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── database.py       # SQLAlchemy engine & SQLite/PostgreSQL configuration
│   │   ├── models.py         # Person, PersonLedger, CompanyLedger models
│   │   ├── schemas.py        # Pydantic schemas & response models
│   │   ├── seed.py           # Sample vendors & realistic seed data
│   │   └── main.py           # FastAPI routes, file uploads, static files
│   ├── uploads/bills/        # Bill images & PDF invoice storage
│   ├── venv/                 # Python 3 virtual environment
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── components/
│   │   │   ├── DashboardKpiCards.tsx    # 6 Till-Date Master KPI Cards
│   │   │   ├── PersonsKhataTab.tsx      # Tab 1: Vendors table with sticky grand totals
│   │   │   ├── CompanyLedgerTab.tsx     # Tab 2: Company ledger & pending balance
│   │   │   ├── PersonDetailDrawer.tsx   # Slide-over full khata drawer
│   │   │   ├── BillPreviewModal.tsx     # In-app viewer for PDF and bill images
│   │   │   ├── AddPersonModal.tsx       # New vendor creation modal
│   │   │   ├── AddPersonEntryModal.tsx  # Demand/Payout entry modal with upload
│   │   │   └── AddCompanyEntryModal.tsx # Requisition/Receipt entry modal
│   │   ├── types.ts                     # TypeScript definitions
│   │   ├── utils/formatters.ts          # INR currency & date formatters
│   │   ├── globals.css                  # Tailwind styles
│   │   ├── layout.tsx                   # Root Next.js layout
│   │   └── page.tsx                     # Main interactive application page
│   ├── package.json
│   └── tsconfig.json
└── README.md
```

---

## 3. Running Locally

### Backend (FastAPI on Port 8000)
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
API Documentation is interactively accessible at: `http://localhost:8000/docs`

### Frontend (Next.js on Port 3000)
```bash
cd frontend
npm run dev
# or for production:
npm run build && npm run start -p 3000
```
Open `http://localhost:3000` in your browser.
