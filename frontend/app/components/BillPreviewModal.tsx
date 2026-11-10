"use client";

import React, { useEffect } from "react";
import { X, Download, ExternalLink, FileText, ZoomIn } from "lucide-react";

interface Props {
  billUrl: string | null;
  onClose: () => void;
  title?: string;
}

export default function BillPreviewModal({
  billUrl,
  onClose,
  title = "Bill & Invoice Attachment",
}: Props) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!billUrl) return null;

  // Prepend backend URL if relative
  const backendBase = process.env.NEXT_PUBLIC_BACKEND_URL || "";
  const fullUrl = billUrl.startsWith("http") ? billUrl : `${backendBase}${billUrl}`;
  const isPdf = billUrl.toLowerCase().endsWith(".pdf");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 sm:p-6"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">{title}</h3>
              <p className="text-xs text-slate-500 truncate max-w-md">{billUrl}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={fullUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition"
              title="Open in new window"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <a
              href={fullUrl}
              download
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition"
              title="Download file"
            >
              <Download className="w-4 h-4" />
            </a>
            <button
              onClick={onClose}
              className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-auto p-4 bg-slate-100 flex items-center justify-center min-h-[400px]">
          {isPdf ? (
            <iframe
              src={fullUrl}
              className="w-full h-[65vh] rounded-lg border border-slate-300 bg-white"
              title="PDF Bill Viewer"
            />
          ) : (
            <div className="relative max-w-full max-h-[70vh] flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={fullUrl}
                alt="Bill attachment"
                className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-sm border border-slate-300 bg-white"
              />
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>Click outside or press ESC to dismiss</span>
          <a
            href={fullUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline font-medium inline-flex items-center gap-1"
          >
            Direct File Link &rarr;
          </a>
        </div>
      </div>
    </div>
  );
}
