"use client";

import React from "react";
import {
  Wallet,
  Users,
  Building2,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import { DashboardSummary } from "../types";
import { formatINR } from "../utils/formatters";

interface Props {
  summary: DashboardSummary | null;
  loading: boolean;
  onRefresh: () => void;
  onResetSeed: () => void;
  onSelectTab?: (tab: "persons" | "company") => void;
}

export default function DashboardKpiCards({
  summary,
  loading,
  onRefresh,
  onResetSeed,
  onSelectTab,
}: Props) {
  if (loading || !summary) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-32 bg-white rounded-3xl border border-slate-100 animate-pulse p-6 shadow-sm"
          >
            <div className="h-4 bg-slate-200 rounded w-1/3 mb-3"></div>
            <div className="h-8 bg-slate-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  const isMarketPayable = summary.market_net_balance < -0.001;

  return (
    <div className="space-y-3">
      {/* 3 Simple, Big, Beautiful Hero Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Cash in Hand (My Liquid Balance) */}
        <div className="bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 rounded-3xl p-6 text-white shadow-md shadow-emerald-500/10 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-100 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-emerald-200" />
              Cash In Hand (Available Float)
            </span>
            <span className="text-[10px] font-extrabold bg-white/20 text-white px-2.5 py-0.5 rounded-full">
              POCKET BALANCE
            </span>
          </div>

          <div className="my-3">
            <div className="text-3xl sm:text-4xl font-black tracking-tight">
              {formatINR(summary.net_cash_in_hand, { showSign: true })}
            </div>
            <p className="text-xs text-emerald-100 mt-1.5 font-medium">
              Liquid funds ready with you right now
            </p>
          </div>

          <div className="pt-3 border-t border-white/15 flex items-center justify-between text-[11px] text-emerald-100">
            <span>Company Received: <b>{formatINR(summary.total_received_from_company)}</b></span>
            <span>Paid Out: <b>{formatINR(summary.total_paid_to_market)}</b></span>
          </div>
        </div>

        {/* Card 2: Market Payables (Vendors) */}
        <div
          onClick={() => onSelectTab && onSelectTab("persons")}
          className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:border-blue-400 hover:shadow-md transition cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <Users className="w-4 h-4 text-rose-500" />
              Market Vendors Balance
            </span>
            <span
              className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                isMarketPayable
                  ? "bg-rose-100 text-rose-700"
                  : "bg-emerald-100 text-emerald-700"
              }`}
            >
              {isMarketPayable ? "AUR DENE HAIN" : "ADVANCE PAID"}
            </span>
          </div>

          <div className="my-3">
            <div
              className={`text-3xl sm:text-4xl font-black tracking-tight ${
                isMarketPayable ? "text-rose-600" : "text-emerald-600"
              }`}
            >
              {formatINR(summary.market_net_balance, { showSign: true })}
            </div>
            <p className="text-xs text-slate-500 mt-1.5 font-medium">
              {isMarketPayable
                ? `Total money you still have to pay to vendors`
                : `You have extra credit / advance with vendors`}
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
            <span>Bills: <b className="text-rose-600">{formatINR(summary.total_market_demand)}</b></span>
            <span>Paid: <b className="text-blue-600">{formatINR(summary.total_paid_to_market)}</b></span>
          </div>
        </div>

        {/* Card 3: Company Funding */}
        <div
          onClick={() => onSelectTab && onSelectTab("company")}
          className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:border-indigo-400 hover:shadow-md transition cursor-pointer flex flex-col justify-between group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-500" />
              Company Funding Status
            </span>
            <span className="text-[10px] font-extrabold bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full">
              PENDING: {formatINR(summary.pending_from_company)}
            </span>
          </div>

          <div className="my-3">
            <div className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              {formatINR(summary.total_received_from_company)}
            </div>
            <p className="text-xs text-slate-500 mt-1.5 font-medium">
              Received from Company so far (Demanded: {formatINR(summary.total_demanded_from_company)})
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
            <span>Cash: <b>{formatINR(summary.cash_received)}</b></span>
            <span>Cheque: <b>{formatINR(summary.cheque_received)}</b></span>
            <span>Bank: <b>{formatINR(summary.bank_received)}</b></span>
          </div>
        </div>
      </div>

      {/* Quick Status Line & Utility Bar */}
      <div className="flex items-center justify-between px-2 pt-1">
        <p className="text-xs text-slate-500 font-medium">
          💡 <b>Tip:</b> Click on any vendor below to view their bill attachments and complete ledger statement.
        </p>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="text-xs text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 px-3 py-1 rounded-xl transition flex items-center gap-1 shadow-2xs font-semibold"
          >
            <RefreshCw className="w-3 h-3" />
            Refresh
          </button>
          <button
            onClick={onResetSeed}
            className="text-xs text-amber-800 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1 rounded-xl transition flex items-center gap-1 font-semibold"
          >
            <RotateCcw className="w-3 h-3" />
            Reset Demo
          </button>
        </div>
      </div>
    </div>
  );
}
