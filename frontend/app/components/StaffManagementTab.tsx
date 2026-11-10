"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Users,
  UserPlus,
  Shield,
  Key,
  Trash2,
  CheckCircle,
  XCircle,
  Search,
  UserCheck,
  ShieldCheck,
  Clock,
  Sparkles,
} from "lucide-react";
import { UserProfile } from "../types";
import { getInitials, getAvatarColor, formatDate } from "../utils/formatters";
import AddUserModal from "./AddUserModal";
import ResetPasswordModal from "./ResetPasswordModal";

interface Props {
  currentUser: UserProfile;
  token: string;
  onToast: (msg: string) => void;
}

export default function StaffManagementTab({
  currentUser,
  token,
  onToast,
}: Props) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [selectedUserForReset, setSelectedUserForReset] =
    useState<UserProfile | null>(null);

  // Own password change state (for non-admin or self)
  const [ownNewPassword, setOwnNewPassword] = useState("");
  const [updatingOwnPassword, setUpdatingOwnPassword] = useState(false);

  const fetchUsers = useCallback(async () => {
    if (currentUser.role !== "ADMIN") return;
    try {
      setLoading(true);
      const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL || "https://balance-sheet-backend.onrender.com";
      const res = await fetch(`${backendBase}/api/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setLoading(false);
    }
  }, [currentUser.role, token]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleToggleStatus = async (user: UserProfile) => {
    if (user.id === currentUser.id && user.is_active) {
      alert("You cannot disable your own admin account.");
      return;
    }

    try {
      const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL || "https://balance-sheet-backend.onrender.com";
      const res = await fetch(`${backendBase}/api/users/${user.id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_active: !user.is_active }),
      });
      if (res.ok) {
        onToast(`User @${user.username} account ${!user.is_active ? "activated" : "deactivated"}`);
        fetchUsers();
      }
    } catch (err) {
      console.error("Failed to toggle status:", err);
    }
  };

  const handleDeleteUser = async (user: UserProfile) => {
    if (user.id === currentUser.id) {
      alert("You cannot delete your own admin account.");
      return;
    }
    if (!window.confirm(`Are you sure you want to delete user @${user.username} (${user.full_name})?`)) {
      return;
    }

    try {
      const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL || "https://balance-sheet-backend.onrender.com";
      const res = await fetch(`${backendBase}/api/users/${user.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        onToast(`User @${user.username} deleted successfully`);
        fetchUsers();
      }
    } catch (err) {
      console.error("Failed to delete user:", err);
    }
  };

  const handleUpdateOwnPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownNewPassword.trim() || ownNewPassword.trim().length < 4) {
      alert("Password must be at least 4 characters long");
      return;
    }
    try {
      setUpdatingOwnPassword(true);
      const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL || "https://balance-sheet-backend.onrender.com";
      const res = await fetch(`${backendBase}/api/auth/password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ new_password: ownNewPassword.trim() }),
      });
      if (res.ok) {
        setOwnNewPassword("");
        onToast("Your password has been updated successfully");
      }
    } catch (err) {
      alert("Failed to update password");
    } finally {
      setUpdatingOwnPassword(false);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* If Admin: Master User Management Console */}
      {currentUser.role === "ADMIN" ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          {/* Header */}
          <div className="p-5 sm:p-6 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-200">
                  Admin Access
                </span>
                <h3 className="font-extrabold text-lg text-slate-900">
                  Team &amp; Staff Access Management
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Give your sir, accountants, and staff their unique Login ID &amp; Password to access the website
              </p>
            </div>

            <button
              onClick={() => setIsAddUserOpen(true)}
              className="px-4 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Add New User (ID &amp; Password)</span>
            </button>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-slate-100 border-b border-slate-200 bg-slate-50/50">
            <div className="p-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Total Users
              </span>
              <p className="text-xl font-black text-slate-800 mt-0.5">
                {users.length}
              </p>
            </div>
            <div className="p-4">
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                Active Logins
              </span>
              <p className="text-xl font-black text-emerald-700 mt-0.5">
                {users.filter((u) => u.is_active).length}
              </p>
            </div>
            <div className="p-4">
              <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">
                Admins
              </span>
              <p className="text-xl font-black text-purple-700 mt-0.5">
                {users.filter((u) => u.role === "ADMIN").length}
              </p>
            </div>
            <div className="p-4">
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                Staff Members
              </span>
              <p className="text-xl font-black text-blue-700 mt-0.5">
                {users.filter((u) => u.role === "STAFF").length}
              </p>
            </div>
          </div>

          {/* Search bar */}
          <div className="p-4 border-b border-slate-200 bg-white">
            <div className="relative max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search staff by name or @username..."
                className="w-full pl-10 pr-4 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
              />
            </div>
          </div>

          {/* User Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">User / Staff</th>
                  <th className="px-4 py-3">Login ID</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                      Loading user accounts...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                      No users match your search
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const avatar = getAvatarColor(u.full_name);
                    const initials = getInitials(u.full_name);
                    const isSelf = u.id === currentUser.id;

                    return (
                      <tr key={u.id} className="hover:bg-slate-50/80 transition">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${avatar.bg} ${avatar.text}`}
                            >
                              {initials}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                <span>{u.full_name}</span>
                                {isSelf && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-blue-100 text-blue-700">
                                    YOU
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3.5 font-mono text-slate-700 font-bold">
                          @{u.username}
                        </td>

                        <td className="px-4 py-3.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                              u.role === "ADMIN"
                                ? "bg-purple-100 text-purple-800 border border-purple-200"
                                : "bg-blue-100 text-blue-800 border border-blue-200"
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>

                        <td className="px-4 py-3.5">
                          {u.is_active ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400">
                              <XCircle className="w-3.5 h-3.5 text-slate-400" />
                              Disabled
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-slate-400 text-[11px]">
                          {formatDate(u.created_at)}
                        </td>

                        <td className="px-5 py-3.5 text-right">
                          <div className="inline-flex items-center gap-2">
                            {/* Reset Password Button */}
                            <button
                              onClick={() => setSelectedUserForReset(u)}
                              className="px-2.5 py-1 text-xs font-bold text-slate-700 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 border border-slate-200 rounded-lg transition flex items-center gap-1"
                              title="Set or reset password for this user"
                            >
                              <Key className="w-3 h-3" />
                              <span>Reset Pass</span>
                            </button>

                            {/* Toggle Disable/Enable */}
                            {!isSelf && (
                              <button
                                onClick={() => handleToggleStatus(u)}
                                className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition ${
                                  u.is_active
                                    ? "text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 border-amber-200"
                                    : "text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border-emerald-200"
                                }`}
                                title={u.is_active ? "Disable this account" : "Enable this account"}
                              >
                                {u.is_active ? "Disable" : "Enable"}
                              </button>
                            )}

                            {/* Delete User */}
                            {!isSelf && (
                              <button
                                onClick={() => handleDeleteUser(u)}
                                className="p-1 text-slate-400 hover:text-rose-600 transition rounded-lg hover:bg-rose-50"
                                title="Delete user account"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* If Staff: Profile Overview & Password Change */
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6 max-w-lg">
          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200">
              Staff Account
            </span>
            <h3 className="font-extrabold text-lg text-slate-900 mt-2">
              My Profile &amp; Login Details
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              You are signed in as a staff member with permission to view and record ledger entries.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">Name</span>
              <span className="font-bold text-slate-900">{currentUser.full_name}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">Login ID</span>
              <span className="font-mono font-bold text-slate-900">@{currentUser.username}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500 font-medium">Account Role</span>
              <span className="font-bold text-blue-700">STAFF</span>
            </div>
          </div>

          {/* Change own password */}
          <form onSubmit={handleUpdateOwnPassword} className="space-y-3 pt-2">
            <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
              Change Your Password
            </h4>
            <div className="space-y-1">
              <input
                type="password"
                value={ownNewPassword}
                onChange={(e) => setOwnNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium"
                required
              />
            </div>
            <button
              type="submit"
              disabled={updatingOwnPassword}
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition disabled:opacity-50"
            >
              {updatingOwnPassword ? "Saving..." : "Update Password"}
            </button>
          </form>
        </div>
      )}

      {/* Add User Modal */}
      <AddUserModal
        isOpen={isAddUserOpen}
        onClose={() => setIsAddUserOpen(false)}
        onSuccess={() => {
          onToast("New user account created successfully");
          fetchUsers();
        }}
        token={token}
      />

      {/* Reset Password Modal */}
      <ResetPasswordModal
        user={selectedUserForReset}
        onClose={() => setSelectedUserForReset(null)}
        onSuccess={(msg) => {
          onToast(msg);
          fetchUsers();
        }}
        token={token}
      />
    </div>
  );
}
