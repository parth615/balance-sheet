import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Balance Sheet - 3-Way Intermediary Ledger & Bill Management",
  description: "User-friendly 3-Way Financial Balance Sheet tracking Vendor Payables, Company Funding, and Intermediary Cash Float",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900 font-sans">
        {children}
      </body>
    </html>
  );
}
