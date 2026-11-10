"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Building2,
  Calendar,
  Plus,
  Trash2,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  CreditCard,
  Banknote,
  Landmark,
  Download,
  Clock,
  Sparkles,
} from "lucide-react";
import {
  CompanyLedgerListResponse,
  CompanyLedgerEntry,
  CompanyEntryType,
} from "../types";
import { formatINR, formatDate } from "../utils/formatters";

interface Props {
  onOpenAddCompanyEntry: (defaultType?: CompanyEntryType) => void;
  onRefreshParentSummary: () => void;
}

export default function CompanyLedgerTab({
  onOpenAddCompanyEntry,
  onRefreshParentSummary,
}: Props) {
  const [data, setData] = useState<CompanyLedgerListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [typeFilter, setTypeFilter] = useState<
    "ALL" | "REQUISITION" | "RECEIVED"
  >("ALL");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchLedger = async () => {
    try {
      setLoading(true);
      setError(null);
      const backendBase =
        process.env.NEXT_PUBLIC_BACKEND_URL || "https://balance-sheet-backend.onrender.com";
      const params = new URLSearchParams();
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);

      const res = await fetch(
        `${backendBase}/api/company/ledger?${params.toString()}`
      );
      if (!res.ok) {
        throw new Error("Failed to load company ledger");
      }
      const json: CompanyLedgerListResponse = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || "Failed to load ledger");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, [startDate, endDate]);

  const handleDelete = async (entryId: number) => {
    if (!window.confirm("Delete this company transaction record?")) return;
    try {
      setDeletingId(entryId);
      const backendBase =
        process.env.NEXT_PUBLIC_BACKEND_URL || "https://balance-sheet-backend.onrender.com";
      const res = await fetch(`${backendBase}/api/company/entries/${entryId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error("Failed to delete entry");
      }
      await fetchLedger();
      onRefreshParentSummary();
    } catch (err: any) {
      alert(err.message || "Error deleting entry");
    } finally {
      setDeletingId(null);
    }
  };

  const filteredEntries = useMemo(() => {
    if (!data?.entries) return [];
    if (typeFilter === "ALL") return data.entries;
    return data.entries.filter((e) => e.entry_type === typeFilter);
  }, [data, typeFilter]);

  const handleExportCSV = () => {
    if (!filteredEntries.length) return;
    const headers = [
      "Date",
      "Type",
      "Demand (Requisition)",
      "Received Amount",
      "Payment Mode",
      "Cheque / Ref No",
      "Remarks",
      "Running Pending Balance",
    ];
    const rows = filteredEntries.map((e) => [
      `"${e.entry_date}"`,
      `"${e.entry_type}"`,
      e.entry_type === "REQUISITION" ? e.amount : "",
      e.entry_type === "RECEIVED" ? e.amount : "",
      `"${e.payment_mode || ""}"`,
      `"${e.cheque_or_ref_no || ""}"`,
      `"${(e.remarks || "").replace(/"/g, '""')}"`,
      e.running_pending_balance,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `company_funding_balance_sheet_${
        new Date().toISOString().split("T")[0]
      }.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getModeIcon = (mode: string | null) => {
    if (mode === "CASH")
      return <Banknote className="w-3.5 h-3.5 text-amber-600" />;
    if (mode === "CHEQUE")
      return <CreditCard className="w-3.5 h-3.5 text-blue-600" />;
    if (mode === "BANK_TRANSFER")
      return <Landmark className="w-3.5 h-3.5 text-purple-600" />;
    return null;
  };

  const totals = data?.till_date_totals;

  return (
    <div className="space-y-5">
      {/* 3 Distinct Separated Overview Cards for Company Funding */}
      {totals && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Requisitions Demanded */}
          <div className="bg-white rounded-2xl border border-indigo-200 p-4 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                <ArrowUpRight className="w-4 h-4 text-indigo-600" />
                Total Demanded from Company
              </span>
              <span className="text-[10px] font-extrabold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
                Requisitions
              </span>
            </div>
            <div className="mt-2.5">
              <div className="text-2xl font-black text-indigo-700">
                {formatINR(totals.total_demanded)}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Total advance budget requested from corporate office
              </p>
            </div>
          </div>

          {/* Card 2: Receipts Breakdown */}
          <div className="bg-white rounded-2xl border border-emerald-200 p-4 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
                Total Received from Company
              </span>
              <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                Liquid Inflow
              </span>
            </div>
            <div className="mt-2.5">
              <div className="text-2xl font-black text-emerald-700">
                {formatINR(totals.total_received)}
              </div>
              <div className="flex flex-wrap items-center gap-1.5 mt-2 pt-2 border-t border-slate-100 text-[10px]">
                <span className="bg-amber-50 text-amber-900 px-2 py-0.5 rounded-md font-bold border border-amber-200 flex items-center gap-1">
                  <Banknote className="w-3 h-3 text-amber-600" /> Cash:{" "}
                  {formatINR(totals.cash_received_total)}
                </span>
                <span className="bg-blue-50 text-blue-900 px-2 py-0.5 rounded-md font-bold border border-blue-200 flex items-center gap-1">
                  <CreditCard className="w-3 h-3 text-blue-600" /> Cheque:{" "}
                  {formatINR(totals.cheque_received_total)}
                </span>
                <span className="bg-purple-50 text-purple-900 px-2 py-0.5 rounded-md font-bold border border-purple-200 flex items-center gap-1">
                  <Landmark className="w-3 h-3 text-purple-600" /> Bank:{" "}
                  {formatINR(totals.bank_received_total)}
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Pending from Company */}
          <div className="bg-amber-50/60 rounded-2xl border border-amber-300 p-4 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-700" />
                Pending From Company
              </span>
              <span className="text-[10px] font-black bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">
                To Be Released
              </span>
            </div>
            <div className="mt-2.5">
              <div className="text-2xl font-black text-amber-800">
                {formatINR(totals.pending_from_company)}
              </div>
              <p className="text-[11px] text-amber-900 font-medium mt-1">
                Demanded ({formatINR(totals.total_demanded)}) − Received (
                {formatINR(totals.total_received)})
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Action Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-700">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <span>Category:</span>
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200">
            <button
              onClick={() => setTypeFilter("ALL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                typeFilter === "ALL"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All Records
            </button>
            <button
              onClick={() => setTypeFilter("REQUISITION")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                typeFilter === "REQUISITION"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Demanded Only
            </button>
            <button
              onClick={() => setTypeFilter("RECEIVED")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                typeFilter === "RECEIVED"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Received Only
            </button>
          </div>

          <div className="flex items-center gap-1.5 ml-2">
            <span className="text-slate-500">Date:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none"
            />
            {(startDate || endDate) && (
              <button
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                }}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold ml-1"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onOpenAddCompanyEntry("REQUISITION")}
            className="px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition flex items-center gap-1.5 shadow-xs"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            + Demand from Company
          </button>
          <button
            onClick={() => onOpenAddCompanyEntry("RECEIVED")}
            className="px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition flex items-center gap-1.5 shadow-xs"
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            + Record Money Received
          </button>
          <button
            onClick={handleExportCSV}
            disabled={!filteredEntries.length}
            className="px-3 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition flex items-center gap-1.5 disabled:opacity-40"
            title="Export company balance records"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Company Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50/80 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-3">Entry Type</th>
                <th className="py-3.5 px-4 text-right">
                  My Demand (Requisition)
                </th>
                <th className="py-3.5 px-4 text-right">
                  Received from Company
                </th>
                <th className="py-3.5 px-3">Mode</th>
                <th className="py-3.5 px-3">Cheque / Ref No.</th>
                <th className="py-3.5 px-4">Remarks</th>
                <th className="py-3.5 px-4 text-right">
                  Running Pending Balance
                </th>
                <th className="py-3.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400">
                    Loading company transactions...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={9} className="py-6 text-center text-rose-600">
                    {error}
                  </td>
                </tr>
              ) : filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    No transactions found for the selected filter.
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => {
                  const isRequisition = entry.entry_type === "REQUISITION";
                  return (
                    <tr
                      key={entry.id}
                      className="hover:bg-slate-50/80 transition"
                    >
                      <td className="py-3.5 px-4 font-semibold text-slate-900 whitespace-nowrap">
                        {formatDate(entry.entry_date)}
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isRequisition
                              ? "bg-indigo-100 text-indigo-700 border border-indigo-200"
                              : "bg-emerald-100 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          {isRequisition ? (
                            <>
                              <ArrowUpRight className="w-3 h-3 text-indigo-500" />
                              REQUISITION
                            </>
                          ) : (
                            <>
                              <ArrowDownLeft className="w-3 h-3 text-emerald-500" />
                              RECEIVED
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-indigo-600 whitespace-nowrap">
                        {isRequisition ? formatINR(entry.amount) : "-"}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-600 whitespace-nowrap">
                        {!isRequisition ? formatINR(entry.amount) : "-"}
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        {entry.payment_mode ? (
                          <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700 text-[11px] bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                            {getModeIcon(entry.payment_mode)}
                            {entry.payment_mode}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                        {entry.cheque_or_ref_no || "-"}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                        {entry.remarks || "-"}
                      </td>
                      <td className="py-3.5 px-4 text-right font-extrabold whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-xs ${
                            entry.running_pending_balance > 0.001
                              ? "text-amber-800 bg-amber-50 font-bold border border-amber-200"
                              : "text-slate-600 bg-slate-100"
                          }`}
                        >
                          {formatINR(entry.running_pending_balance)}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleDelete(entry.id)}
                          disabled={deletingId === entry.id}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Delete entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Sticky Till-Date Footer Row */}
            {data && (
              <tfoot className="bg-slate-100 text-slate-900 font-bold border-t-2 border-slate-300">
                <tr>
                  <td
                    colSpan={2}
                    className="py-3.5 px-4 font-black uppercase tracking-wider text-xs"
                  >
                    Till-Date Balance Totals:
                  </td>
                  <td className="py-3.5 px-4 text-right font-black text-indigo-700 text-sm">
                    {formatINR(data.till_date_totals.total_demanded)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-black text-emerald-700 text-sm">
                    {formatINR(data.till_date_totals.total_received)}
                  </td>
                  <td colSpan={3} className="py-3.5 px-3">
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                      <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-semibold border border-amber-200">
                        Cash:{" "}
                        {formatINR(data.till_date_totals.cash_received_total)}
                      </span>
                      <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-semibold border border-blue-200">
                        Cheque:{" "}
                        {formatINR(data.till_date_totals.cheque_received_total)}
                      </span>
                      <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded font-semibold border border-purple-200">
                        Bank:{" "}
                        {formatINR(data.till_date_totals.bank_received_total)}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right font-black text-amber-700 text-sm">
                    {formatINR(data.till_date_totals.pending_from_company)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
