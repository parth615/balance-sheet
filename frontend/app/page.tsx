"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Users,
  Truck,
  Building2,
  Receipt,
  BookOpen,
  UserCheck,
  FileText,
  Settings,
  FileCheck,
  Wallet,
  CheckCircle2,
  Plus,
  FileDown,
  Download,
  RotateCcw,
  Sparkles,
  ChevronDown,
  Trash2,
  LogOut,
  Shield,
  Key,
} from "lucide-react";
import {
  DashboardSummary,
  PersonsListResponse,
  PersonSummary,
  GrandTotals,
  PersonEntryType,
  CompanyEntryType,
  UserProfile,
} from "./types";
import PersonsKhataTab from "./components/PersonsKhataTab";
import CompanyLedgerTab from "./components/CompanyLedgerTab";
import PersonDetailDrawer from "./components/PersonDetailDrawer";
import BillPreviewModal from "./components/BillPreviewModal";
import AddPersonModal from "./components/AddPersonModal";
import AddPersonEntryModal from "./components/AddPersonEntryModal";
import AddCompanyEntryModal from "./components/AddCompanyEntryModal";
import StaffManagementTab from "./components/StaffManagementTab";
import LoginView from "./components/LoginView";
import { formatINR, getInitials, getAvatarColor } from "./utils/formatters";
import { getAuthHeaders } from "./utils/authHeaders";

type NavTab = "customers" | "suppliers" | "cashbook" | "reports" | "settings" | "staff";

export default function Home() {
  const [activeNav, setActiveNav] = useState<NavTab>("customers");

  // Authentication State (Admin & Staff RBAC)
  const [token, setToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem("bs_auth_token");
    const savedUser = localStorage.getItem("bs_auth_user");
    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setCurrentUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem("bs_auth_token");
        localStorage.removeItem("bs_auth_user");
      }
    }
    setAuthLoading(false);
  }, []);

  const handleLoginSuccess = (newToken: string, newUser: UserProfile) => {
    setToken(newToken);
    setCurrentUser(newUser);
    localStorage.setItem("bs_auth_token", newToken);
    localStorage.setItem("bs_auth_user", JSON.stringify(newUser));
  };

  const handleLogout = () => {
    setToken(null);
    setCurrentUser(null);
    setSummary(null);
    setPersonsData({
      items: [],
      grand_totals: {
        total_demand_all: 0,
        total_paid_all: 0,
        net_balance_all: 0,
        total_payable_market: 0,
        total_advance_market: 0,
      },
    });
    setSelectedPersonId(null);
    setActiveNav("customers");
    localStorage.removeItem("bs_auth_token");
    localStorage.removeItem("bs_auth_user");
  };

  // Summary State
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  // Persons List State
  const [personsData, setPersonsData] = useState<PersonsListResponse>({
    items: [],
    grand_totals: {
      total_demand_all: 0,
      total_paid_all: 0,
      net_balance_all: 0,
      total_payable_market: 0,
      total_advance_market: 0,
    },
  });
  const [personsLoading, setPersonsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Toast Notification State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Modals & Drawer State
  const [isAddPersonOpen, setIsAddPersonOpen] = useState(false);
  const [isAddEntryOpen, setIsAddEntryOpen] = useState(false);
  const [selectedPersonForEntry, setSelectedPersonForEntry] = useState<
    number | null
  >(null);
  const [defaultEntryType, setDefaultEntryType] =
    useState<PersonEntryType>("DEMAND");

  const [isAddCompanyEntryOpen, setIsAddCompanyEntryOpen] = useState(false);
  const [defaultCompanyType, setDefaultCompanyType] =
    useState<CompanyEntryType>("REQUISITION");

  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);

  // Bill Preview Modal
  const [previewBillUrl, setPreviewBillUrl] = useState<string | null>(null);
  const [previewBillTitle, setPreviewBillTitle] = useState<string>("Bill Preview");

  const backendBase =
    process.env.NEXT_PUBLIC_BACKEND_URL || "https://balance-sheet-backend.onrender.com";

  // Fetch KPI Summary
  const fetchSummary = useCallback(async () => {
    if (!token) return;
    try {
      setSummaryLoading(true);
      const res = await fetch(`${backendBase}/api/dashboard/summary`, {
        headers: getAuthHeaders(),
      });
      if (res.status === 401) {
        handleLogout();
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      }
    } catch (err) {
      console.error("Error fetching summary:", err);
    } finally {
      setSummaryLoading(false);
    }
  }, [backendBase, token]);

  // Fetch Persons List
  const fetchPersons = useCallback(async () => {
    if (!token) return;
    try {
      setPersonsLoading(true);
      const params = new URLSearchParams();
      if (searchQuery.trim()) {
        params.append("search", searchQuery.trim());
      }
      const res = await fetch(`${backendBase}/api/persons?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      if (res.status === 401) {
        handleLogout();
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setPersonsData(data);
      }
    } catch (err) {
      console.error("Error fetching persons:", err);
    } finally {
      setPersonsLoading(false);
    }
  }, [backendBase, searchQuery, token]);

  useEffect(() => {
    if (token) {
      fetchSummary();
    }
  }, [fetchSummary, token]);

  useEffect(() => {
    if (token) {
      fetchPersons();
    }
  }, [fetchPersons, token]);

  const handleRefreshAll = (msg?: string) => {
    fetchSummary();
    fetchPersons();
    if (msg) showToast(msg);
  };

  const handleResetSeed = async () => {
    if (!window.confirm("Load sample demonstration records into your private ledger?")) return;
    try {
      const res = await fetch(`${backendBase}/api/reset-seed`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        handleRefreshAll("Loaded sample records successfully");
        if (selectedPersonId) setSelectedPersonId(null);
      }
    } catch (err) {
      console.error("Failed to reset:", err);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm("Are you sure you want to remove all records from your private ledger? This will give you a fresh empty balance sheet.")) return;
    try {
      const res = await fetch(`${backendBase}/api/clear-all`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        handleRefreshAll("Your private ledger data removed successfully");
        if (selectedPersonId) setSelectedPersonId(null);
      }
    } catch (err) {
      console.error("Failed to clear:", err);
    }
  };

  const openAddEntryModal = (
    personId?: number,
    type: PersonEntryType = "DEMAND"
  ) => {
    setSelectedPersonForEntry(personId || null);
    setDefaultEntryType(type);
    setIsAddEntryOpen(true);
  };

  const openAddCompanyEntryModal = (
    type: CompanyEntryType = "REQUISITION"
  ) => {
    setDefaultCompanyType(type);
    setIsAddCompanyEntryOpen(true);
  };

  const handleBillPreview = (url: string, title?: string) => {
    setPreviewBillUrl(url);
    if (title) setPreviewBillTitle(title);
  };

  // If verifying stored session
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 animate-pulse flex items-center justify-center font-black text-lg">
            BS
          </div>
          <p className="text-xs text-slate-400 font-medium">Verifying authorization...</p>
        </div>
      </div>
    );
  }

  // If not logged in, show secure login portal
  if (!token || !currentUser) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  const userAvatar = getAvatarColor(currentUser.full_name);
  const userInitials = getInitials(currentUser.full_name);

  return (
    <div className="min-h-screen bg-[#f4f6f9] text-slate-900 flex flex-col md:flex-row font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-semibold animate-in slide-in-from-bottom duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. LEFT SIDEBAR (Dark Navy Blue - Exact Khatabook App Theme) */}
      <aside className="w-full md:w-64 bg-[#0d1726] text-slate-300 flex flex-col shrink-0 border-r border-[#1a273a] select-none">
        {/* Brand / Business Header */}
        <div className="p-4 border-b border-[#1a273a] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#1a73e8] text-white flex items-center justify-center font-black text-sm shadow-sm">
              BS
            </div>
            <div>
              <div className="flex items-center gap-1 cursor-pointer">
                <span className="font-bold text-white text-sm tracking-tight">
                  Balance Sheet
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <p className="text-[10px] text-slate-400 font-medium">
                3-Way Intermediary Ledger
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Categories */}
        <div className="flex-1 py-4 px-3 space-y-6 overflow-y-auto">
          {/* Section: LEDGER MANAGEMENT */}
          <div className="space-y-1">
            <div className="px-3 text-[10px] font-black text-[#5b6f8a] uppercase tracking-wider mb-2">
              LEDGER MANAGEMENT
            </div>

            {/* Customers / Vendors */}
            <button
              onClick={() => setActiveNav("customers")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition text-left ${
                activeNav === "customers"
                  ? "bg-[#1c2c47] text-white shadow-xs font-extrabold"
                  : "text-slate-400 hover:text-white hover:bg-[#142034]"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Customers / Vendors</span>
            </button>

            {/* Suppliers / Company Funding */}
            <button
              onClick={() => setActiveNav("suppliers")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition text-left ${
                activeNav === "suppliers"
                  ? "bg-[#1c2c47] text-white shadow-xs font-extrabold"
                  : "text-slate-400 hover:text-white hover:bg-[#142034]"
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>Suppliers / Company</span>
            </button>

            {/* Expenses */}
            <button
              onClick={() => {
                setActiveNav("customers");
                openAddEntryModal(undefined, "DEMAND");
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-[#142034] transition text-left"
            >
              <Receipt className="w-4 h-4" />
              <span>Expenses &amp; Bills</span>
            </button>

            {/* Cashbook (Float) */}
            <button
              onClick={() => setActiveNav("cashbook")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition text-left ${
                activeNav === "cashbook"
                  ? "bg-[#1c2c47] text-white shadow-xs font-extrabold"
                  : "text-slate-400 hover:text-white hover:bg-[#142034]"
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Cashbook (Float)</span>
            </button>

            {/* Staff / Team Access */}
            <button
              onClick={() => setActiveNav("staff")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition text-left ${
                activeNav === "staff"
                  ? "bg-[#1c2c47] text-white shadow-xs font-extrabold"
                  : "text-slate-400 hover:text-white hover:bg-[#142034]"
              }`}
            >
              <div className="flex items-center gap-3">
                <UserCheck className="w-4 h-4" />
                <span>Staff &amp; Access</span>
              </div>
              {currentUser.role === "ADMIN" && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-purple-500/20 text-purple-300 uppercase">
                  Admin
                </span>
              )}
            </button>

            {/* Reports */}
            <button
              onClick={() => setActiveNav("reports")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition text-left ${
                activeNav === "reports"
                  ? "bg-[#1c2c47] text-white shadow-xs font-extrabold"
                  : "text-slate-400 hover:text-white hover:bg-[#142034]"
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Reports - Parties</span>
            </button>

            {/* Settings */}
            <button
              onClick={() => setActiveNav("settings")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition text-left ${
                activeNav === "settings"
                  ? "bg-[#1c2c47] text-white shadow-xs font-extrabold"
                  : "text-slate-400 hover:text-white hover:bg-[#142034]"
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </button>
          </div>

          {/* Section: BILLS & INVENTORY */}
          <div className="space-y-1 pt-2 border-t border-[#1a273a]">
            <div className="px-3 text-[10px] font-black text-[#5b6f8a] uppercase tracking-wider mb-2">
              BILLS &amp; INVENTORY
            </div>
            <button
              onClick={() => {
                setActiveNav("customers");
                openAddEntryModal(undefined, "DEMAND");
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-[#142034] transition text-left"
            >
              <FileCheck className="w-4 h-4" />
              <span>Bills &amp; Invoices</span>
            </button>
          </div>
        </div>

        {/* Sidebar Footer: Current User Profile & Sign Out */}
        <div className="p-3 border-t border-[#1a273a] bg-[#09111c] space-y-2.5">
          <div className="p-2.5 bg-[#142034] rounded-xl border border-[#1e2f4a] flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${userAvatar.bg} ${userAvatar.text}`}
              >
                {userInitials}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate">
                  {currentUser.full_name}
                </div>
                <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5">
                  <span className="truncate">@{currentUser.username}</span>
                  <span
                    className={`px-1 py-0.2 rounded text-[9px] font-black uppercase ${
                      currentUser.role === "ADMIN"
                        ? "bg-purple-500/20 text-purple-300"
                        : "bg-blue-500/20 text-blue-300"
                    }`}
                  >
                    {currentUser.role}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {currentUser.role === "ADMIN" && (
            <button
              onClick={handleClearAll}
              className="w-full py-2 px-3 text-xs font-bold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 rounded-lg transition flex items-center justify-center gap-2 border border-rose-500/20"
              title="Wipe test cases and start with an empty balance sheet"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Test Cases / Data</span>
            </button>
          )}
        </div>
      </aside>

      {/* 2. MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* Top KPI Ribbon Bar (Exact Khatabook Mobile/Web Top Metrics) */}
        <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-20 shadow-2xs">
          {/* Khatabook 3-KPI Metrics */}
          <div className="flex flex-wrap items-center gap-6 sm:gap-10">
            {/* You will get (Advance paid) */}
            <div>
              <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block">
                You will get
              </span>
              <span className="text-xl sm:text-2xl font-black text-[#16a34a] tracking-tight">
                {formatINR(summary?.total_advance_market ?? 0)}
              </span>
            </div>

            <div className="w-px h-8 bg-slate-200 hidden sm:block"></div>

            {/* You will give (Payable to vendors) */}
            <div>
              <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block">
                You will give
              </span>
              <span className="text-xl sm:text-2xl font-black text-[#e11d48] tracking-tight">
                {formatINR(summary?.total_payable_market ?? 0)}
              </span>
            </div>

            <div className="w-px h-8 bg-slate-200 hidden sm:block"></div>

            {/* Cashbook (Float in Pocket) */}
            <div>
              <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider block">
                Cash in Hand (Float)
              </span>
              <span className="text-xl sm:text-2xl font-black text-emerald-700 tracking-tight">
                {formatINR(summary?.net_cash_in_hand ?? 0, { showSign: true })}
              </span>
            </div>
          </div>

          {/* Right Action: VIEW REPORTS */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                setActiveNav("reports");
              }}
              className="px-3.5 py-2 text-xs font-extrabold text-slate-700 hover:text-blue-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition flex items-center gap-1.5 shadow-2xs uppercase tracking-wide"
            >
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span>VIEW REPORTS</span>
            </button>

            <button
              onClick={() => setActiveNav("cashbook")}
              className="px-3.5 py-2 text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition flex items-center gap-1.5 shadow-xs uppercase tracking-wide"
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>Cashbook</span>
            </button>
          </div>
        </header>

        {/* View Switching Container */}
        <main className="p-4 sm:p-6 flex-1 max-w-7xl w-full mx-auto">
          {/* TAB 1: CUSTOMERS / VENDORS (Exact Khatabook View from reference screenshot) */}
          {activeNav === "customers" && (
            <PersonsKhataTab
              persons={personsData.items}
              grandTotals={personsData.grand_totals}
              loading={personsLoading}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onOpenAddPerson={() => setIsAddPersonOpen(true)}
              onOpenAddEntry={openAddEntryModal}
              onSelectPerson={(id) => setSelectedPersonId(id)}
              onOpenReports={() => setActiveNav("reports")}
            />
          )}

          {/* TAB 2: SUPPLIERS / COMPANY FUNDING */}
          {activeNav === "suppliers" && (
            <CompanyLedgerTab
              onOpenAddCompanyEntry={openAddCompanyEntryModal}
              onRefreshParentSummary={() =>
                handleRefreshAll("Company funding entry recorded")
              }
            />
          )}

          {/* TAB 3: CASHBOOK (FLOAT MANAGEMENT) */}
          {activeNav === "cashbook" && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    Cashbook &amp; Physical Float Balance
                  </h3>
                  <p className="text-xs text-slate-500">
                    Intermediary funds received from company minus all market payouts
                  </p>
                </div>
                <button
                  onClick={() => openAddCompanyEntryModal("RECEIVED")}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition"
                >
                  + Record Company Cash Inflow
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <span className="text-xs font-bold text-emerald-900 uppercase tracking-wide">
                    Available Float (Cash in Hand)
                  </span>
                  <div className="text-2xl font-black text-emerald-700 mt-1">
                    {formatINR(summary?.net_cash_in_hand ?? 0, { showSign: true })}
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <span className="text-xs font-bold text-blue-900 uppercase tracking-wide">
                    Total Company Inflows
                  </span>
                  <div className="text-2xl font-black text-blue-700 mt-1">
                    {formatINR(summary?.total_received_from_company ?? 0)}
                  </div>
                </div>

                <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
                  <span className="text-xs font-bold text-rose-900 uppercase tracking-wide">
                    Total Vendor Outflows
                  </span>
                  <div className="text-2xl font-black text-rose-700 mt-1">
                    {formatINR(summary?.total_paid_to_market ?? 0)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: REPORTS - PARTIES */}
          {activeNav === "reports" && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    Financial Reports &amp; Statements
                  </h3>
                  <p className="text-xs text-slate-500">
                    Export audit-ready CSV reports for parties, demands, and disbursements
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 border border-slate-200 rounded-xl space-y-3">
                  <h4 className="font-bold text-slate-900 text-sm">
                    Party Ledger Summary Report
                  </h4>
                  <p className="text-xs text-slate-500">
                    Download full list of customers with Demands, Payouts, and Net Balances.
                  </p>
                  <button
                    onClick={() => {
                      const csv =
                        "data:text/csv;charset=utf-8,Party Name,Demand,Paid,Net Balance,Status\n" +
                        personsData.items
                          .map(
                            (p) =>
                              `"${p.name}",${p.total_demand_till_date},${p.total_paid_till_date},${p.net_balance},"${p.status_label}"`
                          )
                          .join("\n");
                      const encoded = encodeURI(csv);
                      const a = document.createElement("a");
                      a.href = encoded;
                      a.download = "parties_report.csv";
                      a.click();
                    }}
                    className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Parties Report (.csv)
                  </button>
                </div>

                <div className="p-5 border border-slate-200 rounded-xl space-y-3">
                  <h4 className="font-bold text-slate-900 text-sm">
                    Company Funding Report
                  </h4>
                  <p className="text-xs text-slate-500">
                    Detailed breakdown of requisitions vs receipts across Cash, Cheque, and Bank Transfer.
                  </p>
                  <button
                    onClick={() => setActiveNav("suppliers")}
                    className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                  >
                    View Company Ledger &rarr;
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: SETTINGS */}
          {activeNav === "settings" && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
              <h3 className="font-extrabold text-base text-slate-900 pb-3 border-b border-slate-200">
                Ledger Settings
              </h3>
              <div className="space-y-4 max-w-lg">
                <div className="p-4 bg-rose-50/60 rounded-xl border border-rose-200 space-y-2">
                  <h4 className="font-bold text-rose-900 text-xs">
                    Clear All Test Cases & Data (Fresh Start)
                  </h4>
                  <p className="text-xs text-rose-700/80">
                    Removes all parties, transactions, bills, and test cases so you can start with a fresh, clean zero-balance ledger.
                  </p>
                  <button
                    onClick={handleClearAll}
                    className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition flex items-center gap-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear All Data</span>
                  </button>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <h4 className="font-bold text-slate-900 text-xs">
                    Load Demonstration Samples
                  </h4>
                  <p className="text-xs text-slate-500">
                    Optional: Load realistic sample data (Ramesh Sharma, Suresh Patel, Mohan Lal, and company transactions) to preview ledger features.
                  </p>
                  <button
                    onClick={handleResetSeed}
                    className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-200 hover:bg-slate-300 rounded-lg transition"
                  >
                    Load Demo Samples
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: STAFF & TEAM ACCESS MANAGEMENT */}
          {activeNav === "staff" && (
            <StaffManagementTab
              currentUser={currentUser}
              token={token}
              onToast={showToast}
            />
          )}
        </main>
      </div>

      {/* Floating Action Button (Exact Khatabook Mobile Pill Overlay from user's image) */}
      <div className="fixed bottom-6 right-6 md:hidden z-40">
        <button
          onClick={() => setIsAddPersonOpen(true)}
          className="px-5 py-3 rounded-full text-white font-black text-xs bg-[#c2185b] hover:bg-[#ad1457] shadow-xl flex items-center gap-2 tracking-wide uppercase"
        >
          <Plus className="w-4 h-4" />
          <span>ADD CUSTOMER</span>
        </button>
      </div>

      {/* Slide-over Drawer for Person Detail View (Exact Khatabook Entry Flow) */}
      <PersonDetailDrawer
        personId={selectedPersonId}
        onClose={() => setSelectedPersonId(null)}
        onOpenAddEntry={(pId, type) => openAddEntryModal(pId, type)}
        onOpenBillPreview={handleBillPreview}
        onLedgerUpdated={() =>
          handleRefreshAll("Customer balance statement updated")
        }
      />

      {/* Bill Preview Modal (Renders uploaded SVG/PNG/PDF Bills) */}
      <BillPreviewModal
        billUrl={previewBillUrl}
        title={previewBillTitle}
        onClose={() => setPreviewBillUrl(null)}
      />

      {/* Add New Person Modal */}
      <AddPersonModal
        isOpen={isAddPersonOpen}
        onClose={() => setIsAddPersonOpen(false)}
        onSuccess={() => handleRefreshAll("New customer created successfully")}
      />

      {/* Add Person Entry (Demand or Payout) Modal */}
      <AddPersonEntryModal
        isOpen={isAddEntryOpen}
        onClose={() => setIsAddEntryOpen(false)}
        onSuccess={() => {
          handleRefreshAll("Entry recorded successfully");
          if (selectedPersonId) setSelectedPersonId(selectedPersonId);
        }}
        preselectedPersonId={selectedPersonForEntry}
        defaultEntryType={defaultEntryType}
        personsList={personsData.items}
      />

      {/* Add Company Entry Modal */}
      <AddCompanyEntryModal
        isOpen={isAddCompanyEntryOpen}
        onClose={() => setIsAddCompanyEntryOpen(false)}
        onSuccess={() => handleRefreshAll("Company funding entry recorded")}
        defaultType={defaultCompanyType}
      />
    </div>
  );
}
