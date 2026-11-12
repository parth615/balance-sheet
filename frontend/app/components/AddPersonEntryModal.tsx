"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  FileUp,
  CreditCard,
  Calendar,
  IndianRupee,
  Upload,
  User,
  AlertCircle,
} from "lucide-react";
import { PersonEntryType, PersonPaymentMode, PersonSummary } from "../types";
import { getAuthHeaders } from "../utils/authHeaders";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedPersonId?: number | null;
  defaultEntryType?: PersonEntryType;
  personsList: PersonSummary[];
}

export default function AddPersonEntryModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedPersonId,
  defaultEntryType = "DEMAND",
  personsList,
}: Props) {
  const [personId, setPersonId] = useState<number | "">("");
  const [entryType, setEntryType] = useState<PersonEntryType>(defaultEntryType);
  const [amount, setAmount] = useState<string>("");
  const [entryDate, setEntryDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [paymentMode, setPaymentMode] = useState<PersonPaymentMode>("CASH");
  const [referenceNo, setReferenceNo] = useState<string>("");
  const [remarks, setRemarks] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (preselectedPersonId) {
      setPersonId(preselectedPersonId);
    } else if (personsList.length > 0 && !personId) {
      setPersonId(personsList[0].id);
    }
  }, [preselectedPersonId, personsList]);

  useEffect(() => {
    setEntryType(defaultEntryType);
  }, [defaultEntryType, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personId) {
      setError("Please select a person / vendor");
      return;
    }
    const numAmt = parseFloat(amount);
    if (isNaN(numAmt) || numAmt <= 0) {
      setError("Please enter a valid amount greater than 0");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const formData = new FormData();
      formData.append("entry_type", entryType);
      formData.append("amount", numAmt.toString());
      formData.append("entry_date", entryDate);
      if (entryType === "PAYOUT") {
        formData.append("payment_mode", paymentMode);
        if (referenceNo.trim()) {
          formData.append("reference_no", referenceNo.trim());
        }
      }
      if (remarks.trim()) {
        formData.append("remarks", remarks.trim());
      }
      if (entryType === "DEMAND" && selectedFile) {
        formData.append("bill_file", selectedFile);
      }

      const backendBase =
        process.env.NEXT_PUBLIC_BACKEND_URL || "https://balance-sheet-backend.onrender.com";
      const res = await fetch(`${backendBase}/api/persons/${personId}/entries`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Failed to record entry");
      }

      setAmount("");
      setReferenceNo("");
      setRemarks("");
      setSelectedFile(null);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="font-semibold text-slate-900 text-sm">
              Record Person / Vendor Entry
            </h3>
            <p className="text-xs text-slate-500">
              Demand (Bill received) or Payout (Money given)
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Type Toggle Tabs */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setEntryType("DEMAND")}
              className={`py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
                entryType === "DEMAND"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <FileUp className="w-3.5 h-3.5" />
              DEMAND / BILL (They demanded)
            </button>
            <button
              type="button"
              onClick={() => setEntryType("PAYOUT")}
              className={`py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
                entryType === "PAYOUT"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              PAYOUT (I paid them)
            </button>
          </div>

          {/* Person Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Person / Vendor <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <select
                value={personId}
                onChange={(e) => setPersonId(Number(e.target.value))}
                required
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="" disabled>
                  -- Select Vendor --
                </option>
                {personsList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.phone ? `(${p.phone})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Amount & Date in 2 columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Amount (₹) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <IndianRupee className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-9 pr-3 py-2 text-sm font-semibold border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Entry Date <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="date"
                  required
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>
            </div>
          </div>

          {/* If PAYOUT: Payment Mode and Ref No */}
          {entryType === "PAYOUT" && (
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-emerald-900 mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={paymentMode}
                    onChange={(e) =>
                      setPaymentMode(e.target.value as PersonPaymentMode)
                    }
                    className="w-full px-3 py-2 text-xs font-medium border border-emerald-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="CASH">CASH</option>
                    <option value="UPI">UPI / GPay / PhonePe</option>
                    <option value="CHEQUE">CHEQUE</option>
                    <option value="BANK_TRANSFER">BANK TRANSFER (NEFT/RTGS)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-emerald-900 mb-1">
                    Cheque / Ref No. (Optional)
                  </label>
                  <input
                    type="text"
                    value={referenceNo}
                    onChange={(e) => setReferenceNo(e.target.value)}
                    placeholder="e.g. CHQ-448102 or UPI Ref"
                    className="w-full px-3 py-2 text-xs border border-emerald-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* If DEMAND: Bill File Upload */}
          {entryType === "DEMAND" && (
            <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl space-y-2">
              <label className="block text-xs font-semibold text-rose-900">
                Attach Bill / Invoice Document (Optional)
              </label>
              <div className="flex items-center gap-3">
                <label className="flex-1 cursor-pointer flex items-center justify-center gap-2 px-3 py-2 border-2 border-dashed border-rose-300 hover:border-rose-400 bg-white rounded-lg text-xs font-medium text-rose-700 transition">
                  <Upload className="w-4 h-4 text-rose-500" />
                  <span>
                    {selectedFile ? selectedFile.name : "Select Image or PDF Bill"}
                  </span>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,.pdf,.svg"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setSelectedFile(e.target.files[0]);
                      }
                    }}
                  />
                </label>
                {selectedFile && (
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="text-xs text-rose-600 hover:text-rose-800 underline"
                  >
                    Remove
                  </button>
                )}
              </div>
              <p className="text-[10px] text-rose-600">
                Supports JPG, PNG, WEBP, SVG, and PDF invoice copies
              </p>
            </div>
          )}

          {/* Remarks */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Remarks / Notes (Optional)
            </label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. 50 bags cement delivery or Advance for materials"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-5 py-2 text-xs font-bold text-white rounded-lg shadow-sm transition disabled:opacity-50 ${
                entryType === "DEMAND"
                  ? "bg-rose-600 hover:bg-rose-700"
                  : "bg-emerald-600 hover:bg-emerald-700"
              }`}
            >
              {loading
                ? "Recording..."
                : entryType === "DEMAND"
                ? "Save Demand Entry"
                : "Save Payout Entry"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
