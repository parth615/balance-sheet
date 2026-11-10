"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Calendar,
  FileText,
  Trash2,
  Plus,
  Phone,
  ArrowLeft,
  Download,
  Receipt,
  FileDown,
  Eye,
  AlertCircle,
} from "lucide-react";
import {
  PersonLedgerDetailResponse,
  PersonLedgerEntry,
  PersonEntryType,
} from "../types";
import { formatINR, formatDate, getInitials, getAvatarColor } from "../utils/formatters";

interface Props {
  personId: number | null;
  onClose: () => void;
  onOpenAddEntry: (personId: number, defaultType: PersonEntryType) => void;
  onOpenBillPreview: (billUrl: string, title?: string) => void;
  onLedgerUpdated: () => void;
}

export default function PersonDetailDrawer({
  personId,
  onClose,
  onOpenAddEntry,
  onOpenBillPreview,
  onLedgerUpdated,
}: Props) {
  const [data, setData] = useState<PersonLedgerDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchLedger = async () => {
    if (!personId) return;
    try {
      setLoading(true);
      setError(null);
      const backendBase =
        process.env.NEXT_PUBLIC_BACKEND_URL || "https://balance-sheet-backend.onrender.com";
      const params = new URLSearchParams();
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);

      const res = await fetch(
        `${backendBase}/api/persons/${personId}/ledger?${params.toString()}`
      );
      if (!res.ok) {
        throw new Error("Failed to load person ledger");
      }
      const json: PersonLedgerDetailResponse = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || "Failed to load ledger");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (personId) {
      fetchLedger();
    } else {
      setData(null);
    }
  }, [personId, startDate, endDate]);

  const handleDeleteEntry = async (entryId: number) => {
    if (!window.confirm("Are you sure you want to delete this entry?")) {
      return;
    }
    try {
      setDeletingId(entryId);
      const backendBase =
        process.env.NEXT_PUBLIC_BACKEND_URL || "https://balance-sheet-backend.onrender.com";
      const res = await fetch(`${backendBase}/api/persons/entries/${entryId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error("Failed to delete entry");
      }
      await fetchLedger();
      onLedgerUpdated();
    } catch (err: any) {
      alert(err.message || "Error deleting entry");
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeletePerson = async () => {
    if (!data?.person) return;
    if (!window.confirm(`Delete party "${data.person.name}" and all associated entries?`)) return;
    try {
      const backendBase =
        process.env.NEXT_PUBLIC_BACKEND_URL || "https://balance-sheet-backend.onrender.com";
      const res = await fetch(`${backendBase}/api/persons/${personId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete party");
      onLedgerUpdated();
      onClose();
    } catch (err: any) {
      alert(err.message || "Error deleting party");
    }
  };

  const handleExportCSV = () => {
    if (!data || !data.entries.length) return;
    const headers = [
      "Date",
      "Type",
      "You Got / Bill",
      "You Gave / Paid",
      "Payment Mode",
      "Ref No",
      "Remarks",
      "Running Balance",
    ];
    const rows = data.entries.map((e) => [
      `"${e.entry_date}"`,
      `"${e.entry_type}"`,
      e.entry_type === "DEMAND" ? e.amount : "",
      e.entry_type === "PAYOUT" ? e.amount : "",
      `"${e.payment_mode || ""}"`,
      `"${e.reference_no || ""}"`,
      `"${(e.remarks || "").replace(/"/g, '""')}"`,
      e.running_balance,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `statement_${data.person.name.replace(/[^a-zA-Z0-9]/g, "_")}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!personId) return null;

  const netBal = data?.till_date_summary.net_balance ?? 0;
  const isGive = netBal < -0.001; // You'll give (Red)
  const isGet = netBal > 0.001;   // You'll get (Green)
  const absNet = Math.abs(netBal);

  const avatar = data ? getAvatarColor(data.person.name) : { bg: "bg-blue-100", text: "text-blue-700" };
  const initials = data ? getInitials(data.person.name) : "??";

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex justify-end"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top App Header (Khatabook Mobile/Desktop style) */}
        <div className="px-5 py-4 bg-[#0d1726] text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-1 text-slate-300 hover:text-white rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${avatar.bg} ${avatar.text}`}
            >
              {initials}
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">
                {data?.person.name || "Loading..."}
              </h2>
              {data?.person.phone && (
                <p className="text-xs text-slate-400 flex items-center gap-1 font-medium mt-0.5">
                  <Phone className="w-3 h-3" />
                  {data.person.phone}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDeletePerson}
              className="px-2.5 py-1.5 text-xs font-bold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-lg transition flex items-center gap-1.5"
              title="Delete Party & Khata"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden sm:inline">Delete</span>
            </button>
            <button
              onClick={handleExportCSV}
              disabled={!data?.entries.length}
              className="px-3 py-1.5 text-xs font-bold text-slate-200 bg-white/10 hover:bg-white/20 rounded-lg transition flex items-center gap-1.5"
              title="Download Statement"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Report</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Current Net Balance Banner (Khatabook Style) */}
        {data && (
          <div
            className={`px-5 py-3.5 border-b flex items-center justify-between shrink-0 ${
              isGive
                ? "bg-rose-50/70 border-rose-200"
                : isGet
                ? "bg-emerald-50/70 border-emerald-200"
                : "bg-slate-50 border-slate-200"
            }`}
          >
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Net Balance
              </span>
              <span className="text-xs font-bold text-slate-700">
                {isGive ? "You will give (Aur dene hain)" : isGet ? "You will get (Advance paid)" : "Settled"}
              </span>
            </div>
            <div
              className={`text-2xl font-black ${
                isGive ? "text-[#e11d48]" : isGet ? "text-[#16a34a]" : "text-slate-600"
              }`}
            >
              ₹{absNet.toLocaleString("en-IN")}
            </div>
          </div>
        )}

        {/* Table Column Labels */}
        <div className="px-5 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-[10px] font-extrabold text-slate-500 uppercase tracking-wider shrink-0">
          <span className="w-1/2">ENTRIES</span>
          <div className="w-1/2 flex justify-between pr-2">
            <span className="text-[#e11d48]">YOU GAVE</span>
            <span className="text-[#16a34a]">YOU GOT</span>
          </div>
        </div>

        {/* Entries List (Khatabook Entry Cards) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#f8fafc]">
          {loading ? (
            <div className="py-16 text-center text-slate-400 text-sm">
              Loading transactions...
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
              {error}
            </div>
          ) : !data || data.entries.length === 0 ? (
            <div className="py-16 text-center text-slate-500">
              <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="font-bold text-sm text-slate-700">No transactions recorded yet</p>
              <p className="text-xs text-slate-400 mt-1">
                Use the buttons at the bottom to record payments or bills.
              </p>
            </div>
          ) : (
            data.entries.map((entry) => {
              const isPayout = entry.entry_type === "PAYOUT";
              const isDemand = entry.entry_type === "DEMAND";

              return (
                <div
                  key={entry.id}
                  className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-2xs hover:shadow-xs transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Left: Date, Remarks, Bill Tag */}
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          {formatDate(entry.entry_date)}
                        </span>
                        {entry.payment_mode && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                            {entry.payment_mode}
                          </span>
                        )}
                        {entry.reference_no && (
                          <span className="text-[10px] font-mono text-slate-500">
                            #{entry.reference_no}
                          </span>
                        )}
                      </div>

                      {entry.remarks && (
                        <p className="text-xs text-slate-600 font-medium">
                          {entry.remarks}
                        </p>
                      )}

                      {/* Bill attachment button if present */}
                      {entry.bill_attachment_url && (
                        <div className="pt-1">
                          <button
                            onClick={() =>
                              onOpenBillPreview(
                                entry.bill_attachment_url!,
                                `Invoice Bill (${formatDate(entry.entry_date)})`
                              )
                            }
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>View Bill / Invoice</span>
                          </button>
                        </div>
                      )}

                      <div className="text-[10px] text-slate-400 pt-0.5">
                        Bal: <b className="text-slate-700">{formatINR(entry.running_balance, { showSign: true })}</b>
                      </div>
                    </div>

                    {/* Right: Amounts in You Gave / You Got columns */}
                    <div className="flex items-center gap-4 text-right shrink-0">
                      <div className="w-20 text-right font-extrabold text-sm text-[#e11d48]">
                        {isPayout ? `₹${entry.amount.toLocaleString("en-IN")}` : "-"}
                      </div>
                      <div className="w-20 text-right font-extrabold text-sm text-[#16a34a]">
                        {isDemand ? `₹${entry.amount.toLocaleString("en-IN")}` : "-"}
                      </div>

                      {/* Delete */}
                      <button
                        onClick={() => handleDeleteEntry(entry.id)}
                        disabled={deletingId === entry.id}
                        className="p-1 text-slate-300 hover:text-rose-600 transition"
                        title="Delete entry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Iconic Khatabook Sticky Dual Action Buttons at Bottom */}
        <div className="p-4 bg-white border-t border-slate-200 grid grid-cols-2 gap-3 shrink-0">
          {/* RED BUTTON: YOU GAVE ₹ (Record Payout) */}
          <button
            onClick={() => onOpenAddEntry(personId, "PAYOUT")}
            className="w-full py-3 px-4 rounded-xl font-black text-xs sm:text-sm text-white bg-[#e11d48] hover:bg-[#be123c] transition shadow-sm flex items-center justify-center gap-2 uppercase tracking-wide"
          >
            <span>YOU GAVE ₹</span>
          </button>

          {/* GREEN BUTTON: YOU GOT ₹ (Record Bill Demand) */}
          <button
            onClick={() => onOpenAddEntry(personId, "DEMAND")}
            className="w-full py-3 px-4 rounded-xl font-black text-xs sm:text-sm text-white bg-[#16a34a] hover:bg-[#15803d] transition shadow-sm flex items-center justify-center gap-2 uppercase tracking-wide"
          >
            <span>YOU GOT ₹ / BILL</span>
          </button>
        </div>
      </div>
    </div>
  );
}
