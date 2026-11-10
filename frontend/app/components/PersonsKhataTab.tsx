"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  UserPlus,
  Plus,
  FileUp,
  CreditCard,
  ChevronRight,
  Phone,
  ArrowRight,
  Download,
  Filter,
  FileSpreadsheet,
  Clock,
  Sparkles,
  Users,
} from "lucide-react";
import { PersonSummary, GrandTotals, PersonEntryType } from "../types";
import { formatINR, getInitials, getAvatarColor } from "../utils/formatters";

interface Props {
  persons: PersonSummary[];
  grandTotals: GrandTotals;
  loading: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenAddPerson: () => void;
  onOpenAddEntry: (personId?: number, defaultType?: PersonEntryType) => void;
  onSelectPerson: (personId: number) => void;
  onOpenReports?: () => void;
}

export default function PersonsKhataTab({
  persons,
  grandTotals,
  loading,
  searchQuery,
  onSearchChange,
  onOpenAddPerson,
  onOpenAddEntry,
  onSelectPerson,
  onOpenReports,
}: Props) {
  // Filter by: "ALL" | "GIVE" (You'll give / payable) | "GET" (You'll get / advance) | "SETTLED"
  const [filterBy, setFilterBy] = useState<"ALL" | "GIVE" | "GET" | "SETTLED">("ALL");

  // Sort by: "RECENT" | "AMOUNT_HIGH" | "NAME"
  const [sortBy, setSortBy] = useState<"RECENT" | "AMOUNT_HIGH" | "NAME">("RECENT");

  // Filtering & Sorting
  const processedPersons = useMemo(() => {
    let result = persons.filter((p) => {
      // Status filter
      if (filterBy === "GIVE") return p.net_balance < -0.001;
      if (filterBy === "GET") return p.net_balance > 0.001;
      if (filterBy === "SETTLED") return p.net_balance >= -0.001 && p.net_balance <= 0.001;
      return true;
    });

    // Sorting
    return result.sort((a, b) => {
      if (sortBy === "AMOUNT_HIGH") {
        return Math.abs(b.net_balance) - Math.abs(a.net_balance);
      }
      if (sortBy === "NAME") {
        return a.name.localeCompare(b.name);
      }
      // Most recent (id desc)
      return b.id - a.id;
    });
  }, [persons, filterBy, sortBy]);

  // Mock relative time generator for authentic Khatabook feel
  const getRelativeTime = (id: number) => {
    if (id === 1) return "Just now";
    if (id === 2) return "2 minutes ago";
    if (id === 3) return "1 hour ago";
    if (id % 4 === 0) return "Yesterday";
    if (id % 4 === 1) return "2 days ago";
    if (id % 4 === 2) return "1 week ago";
    return "1 month ago";
  };

  const handleExportCSV = () => {
    const headers = [
      "Customer / Vendor Name",
      "Phone",
      "Total Demand (Bills)",
      "Total Paid",
      "Net Balance",
      "Status",
    ];
    const rows = processedPersons.map((p) => [
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.phone || ""}"`,
      p.total_demand_till_date,
      p.total_paid_till_date,
      p.net_balance,
      `"${p.status_label}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `khatabook_balance_sheet_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col min-h-[640px]">
      {/* Top Filter and Search Bar (Exact Khatabook Web Interface) */}
      <div className="p-4 sm:p-5 border-b border-slate-200 bg-white">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 items-end">
          {/* Search Input */}
          <div className="md:col-span-6 space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              Search for customers
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Name or Phone Number"
                className="w-full pl-10 pr-9 py-2 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-white transition placeholder:text-slate-400 font-medium text-slate-900"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange("")}
                  className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600 font-bold"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Filter by */}
          <div className="md:col-span-3 space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              Filter by
            </label>
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value as any)}
              className="w-full py-2 px-3 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-white font-semibold text-slate-800 cursor-pointer"
            >
              <option value="ALL">All ({persons.length})</option>
              <option value="GIVE">You&apos;ll Give (Aur dene hain)</option>
              <option value="GET">You&apos;ll Get (Advance paid)</option>
              <option value="SETTLED">Settled (Chukta)</option>
            </select>
          </div>

          {/* Sort by */}
          <div className="md:col-span-3 space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              Sort by
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full py-2 px-3 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-white font-semibold text-slate-800 cursor-pointer"
            >
              <option value="RECENT">Most Recent</option>
              <option value="AMOUNT_HIGH">Highest Amount</option>
              <option value="NAME">Name (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Column Headers */}
      <div className="px-5 py-2.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
        <span>NAME</span>
        <span>AMOUNT</span>
      </div>

      {/* Customer / Vendor Rows (Exact Khatabook Row Styling) */}
      <div className="flex-1 divide-y divide-slate-100 overflow-y-auto">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            Loading customer accounts...
          </div>
        ) : processedPersons.length === 0 ? (
          <div className="py-20 text-center text-slate-500 flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
              <Users className="w-7 h-7" />
            </div>
            <p className="font-bold text-sm text-slate-800">
              {persons.length === 0 ? "No customers or vendors yet" : "No matching customers found"}
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              {persons.length === 0
                ? "All test cases removed. Click '+ Add Customer' below to add your first party."
                : "Try resetting your filter or search query"}
            </p>
            {persons.length === 0 && (
              <button
                onClick={onOpenAddPerson}
                className="mt-4 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition"
              >
                + Add Customer
              </button>
            )}
          </div>
        ) : (
          processedPersons.map((person) => {
            const isGive = person.net_balance < -0.001; // You'll give (Red)
            const isGet = person.net_balance > 0.001;   // You'll get (Green)
            const initials = getInitials(person.name);
            const avatarColor = getAvatarColor(person.name);
            const absAmount = Math.abs(person.net_balance);

            return (
              <div
                key={person.id}
                onClick={() => onSelectPerson(person.id)}
                className="px-5 py-3.5 hover:bg-slate-50 transition-colors flex items-center justify-between cursor-pointer group"
              >
                {/* Left Side: Circular Avatar & Name Details */}
                <div className="flex items-center gap-3.5 min-w-[200px]">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${avatarColor.bg} ${avatarColor.text}`}
                  >
                    {initials}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition flex items-center gap-1.5">
                      <span>{person.name}</span>
                    </h4>
                    <p className="text-xs text-slate-400 font-medium">
                      {getRelativeTime(person.id)}
                      {person.phone && ` • ${person.phone}`}
                    </p>
                  </div>
                </div>

                {/* Right Side: Amount & Status (Exact Khatabook formatting) */}
                <div className="text-right flex items-center gap-4">
                  <div>
                    <div
                      className={`text-base font-extrabold tracking-tight ${
                        isGive
                          ? "text-[#e11d48]" // Red: You'll give
                          : isGet
                          ? "text-[#16a34a]" // Green: You'll get
                          : "text-slate-500" // Gray: Settled
                      }`}
                    >
                      ₹{absAmount.toLocaleString("en-IN")}
                    </div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {isGive
                        ? "YOU'LL GIVE"
                        : isGet
                        ? "YOU'LL GET"
                        : "SETTLED"}
                    </div>
                  </div>

                  {/* Optional Remind / Action tag */}
                  {isGive && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenAddEntry(person.id, "PAYOUT");
                      }}
                      className="hidden sm:inline-flex items-center text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline pl-2"
                    >
                      Pay &gt;
                    </button>
                  )}
                  {isGet && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenAddEntry(person.id, "DEMAND");
                      }}
                      className="hidden sm:inline-flex items-center text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline pl-2"
                    >
                      Remind &gt;
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Fixed Action Bar (Exact Khatabook Desktop Layout) */}
      <div className="p-4 border-t border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 text-xs sm:text-sm font-bold text-blue-600 hover:bg-blue-50 border border-blue-600 rounded-lg transition shadow-2xs"
          >
            + Add Bulk Import Customer
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenAddPerson}
            className="px-6 py-2.5 text-xs sm:text-sm font-bold text-white bg-[#1a73e8] hover:bg-[#1557b0] rounded-lg transition shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            + Add Customer
          </button>
        </div>
      </div>
    </div>
  );
}
