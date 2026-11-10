export type PersonEntryType = "DEMAND" | "PAYOUT";
export type PersonPaymentMode = "CASH" | "CHEQUE" | "UPI" | "BANK_TRANSFER";

export type CompanyEntryType = "REQUISITION" | "RECEIVED";
export type CompanyPaymentMode = "CASH" | "CHEQUE" | "BANK_TRANSFER";

export interface PersonSummary {
  id: number;
  name: string;
  phone: string | null;
  created_at: string;
  total_demand_till_date: number;
  total_paid_till_date: number;
  net_balance: number;
  status_label: string;
}

export interface GrandTotals {
  total_demand_all: number;
  total_paid_all: number;
  net_balance_all: number;
  total_payable_market: number;
  total_advance_market: number;
}

export interface PersonsListResponse {
  items: PersonSummary[];
  grand_totals: GrandTotals;
}

export interface PersonLedgerEntry {
  id: number;
  person_id: number;
  entry_type: PersonEntryType;
  amount: number;
  entry_date: string;
  bill_attachment_url: string | null;
  payment_mode: PersonPaymentMode | null;
  reference_no: string | null;
  remarks: string | null;
  created_at: string;
  running_balance: number;
}

export interface PersonTillDateSummary {
  total_demand: number;
  total_paid: number;
  net_balance: number;
  status_label: string;
  total_bills_count: number;
  filtered_demand: number;
  filtered_paid: number;
}

export interface PersonLedgerDetailResponse {
  person: PersonSummary;
  entries: PersonLedgerEntry[];
  till_date_summary: PersonTillDateSummary;
}

export interface CompanyLedgerEntry {
  id: number;
  entry_type: CompanyEntryType;
  amount: number;
  entry_date: string;
  payment_mode: CompanyPaymentMode | null;
  cheque_or_ref_no: string | null;
  remarks: string | null;
  created_at: string;
  running_pending_balance: number;
}

export interface CompanyTillDateTotals {
  total_demanded: number;
  total_received: number;
  pending_from_company: number;
  cash_received_total: number;
  cheque_received_total: number;
  bank_received_total: number;
}

export interface CompanyLedgerListResponse {
  entries: CompanyLedgerEntry[];
  till_date_totals: CompanyTillDateTotals;
}

export interface DashboardSummary {
  total_market_demand: number;
  total_paid_to_market: number;
  market_net_balance: number;
  total_payable_market: number;
  total_advance_market: number;

  total_demanded_from_company: number;
  total_received_from_company: number;
  cash_received: number;
  cheque_received: number;
  bank_received: number;
  pending_from_company: number;

  net_cash_in_hand: number;
}

export type UserRole = "ADMIN" | "STAFF";

export interface UserProfile {
  id: number;
  username: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface LoginResponse {
  token: string;
  user: UserProfile;
}
