"use client";

import React, { useState } from "react";
import { X, UserPlus, Shield, User, Lock, Sparkles, Key } from "lucide-react";
import { UserRole } from "../types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  token: string;
}

export default function AddUserModal({
  isOpen,
  onClose,
  onSuccess,
  token,
}: Props) {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("STAFF");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const generateSimplePassword = () => {
    const chars = "abcdefghjkmnpqrstuvwxyz23456789";
    let res = "";
    for (let i = 0; i < 8; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(res);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !username.trim() || !password.trim()) {
      setError("Please fill out all fields");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL || "";
      const res = await fetch(`${backendBase}/api/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          full_name: fullName.trim(),
          username: username.trim().toLowerCase(),
          password: password.trim(),
          role,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Failed to create user account");
      }

      setFullName("");
      setUsername("");
      setPassword("");
      setRole("STAFF");
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-5 bg-[#0d1726] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">
                Add New Staff / User
              </h3>
              <p className="text-[11px] text-slate-400">
                Create login ID and password for team member
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
              {error}
            </div>
          )}

          {/* Full Name */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Person / Staff Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Vikram Sir, Rahul Accountant"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
              required
            />
          </div>

          {/* Username / Login ID */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Login ID / Username
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-slate-400 font-mono text-sm">
                @
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ""))}
                placeholder="e.g. vikram_sir or rahul"
                className="w-full pl-8 pr-3.5 py-2.5 text-sm font-mono border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                required
              />
            </div>
            <p className="text-[10px] text-slate-400">
              Unique ID they will type on the login screen
            </p>
          </div>

          {/* Password */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Assign Password
              </label>
              <button
                type="button"
                onClick={generateSimplePassword}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                <span>Generate</span>
              </button>
            </div>
            <div className="relative">
              <Key className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Assign a secure password"
                className="w-full pl-10 pr-3.5 py-2.5 text-sm font-mono border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                required
              />
            </div>
            <p className="text-[10px] text-slate-400">
              Share this password with them along with their Login ID
            </p>
          </div>

          {/* Role Selection */}
          <div className="space-y-1.5 pt-1">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Account Role &amp; Permissions
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`flex flex-col p-3 rounded-xl border cursor-pointer transition ${
                  role === "STAFF"
                    ? "bg-blue-50/60 border-blue-500 ring-2 ring-blue-500/20"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="role"
                    value="STAFF"
                    checked={role === "STAFF"}
                    onChange={() => setRole("STAFF")}
                    className="text-blue-600"
                  />
                  <span className="font-bold text-xs text-slate-900">STAFF</span>
                </div>
                <span className="text-[10px] text-slate-500 mt-1">
                  Can record demands, payouts &amp; view ledger
                </span>
              </label>

              <label
                className={`flex flex-col p-3 rounded-xl border cursor-pointer transition ${
                  role === "ADMIN"
                    ? "bg-purple-50/60 border-purple-500 ring-2 ring-purple-500/20"
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="role"
                    value="ADMIN"
                    checked={role === "ADMIN"}
                    onChange={() => setRole("ADMIN")}
                    className="text-purple-600"
                  />
                  <span className="font-bold text-xs text-slate-900">ADMIN</span>
                </div>
                <span className="text-[10px] text-slate-500 mt-1">
                  Full control: create IDs, change passwords &amp; settings
                </span>
              </label>
            </div>
          </div>

          {/* Submit Actions */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition disabled:opacity-50"
            >
              {loading ? "Creating User..." : "Save & Create User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
