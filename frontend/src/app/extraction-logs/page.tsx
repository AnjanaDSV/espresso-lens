"use client";

import React, { useState } from "react";
import { Sliders, Filter, CheckCircle, AlertTriangle, Eye, ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";

const MOCK_LOGS = [
  { id: 1, bean: "Ethiopia Yirgacheffe Kochere", roaster: "Blueprint Coffee", dose: "18.0g", yield: "38.2g", time: "27.5s", rating: "8.5", pressure: "9-bar flat", date: "2026-06-01 11:24", status: "Balanced" },
  { id: 2, bean: "Monolith Espresso Blend", roaster: "Onyx Coffee Lab", dose: "20.0g", yield: "40.0g", time: "31.2s", rating: "9.2", pressure: "6-bar pre-infusion, peak 9-bar", date: "2026-06-01 09:12", status: "Optimal" },
  { id: 3, bean: "Monolith Espresso Blend", roaster: "Onyx Coffee Lab", dose: "20.0g", yield: "38.5g", time: "25.0s", rating: "7.0", pressure: "9-bar flat", date: "2026-05-31 16:45", status: "Uneven Flow" },
  { id: 4, bean: "Gesha Village Lot 42", roaster: "Proud Mary", dose: "19.5g", yield: "44.0g", time: "29.2s", rating: "9.6", pressure: "Slayer-style flow profile", date: "2026-05-31 08:30", status: "Optimal" },
  { id: 5, bean: "Ethiopia Yirgacheffe Kochere", roaster: "Blueprint Coffee", dose: "18.0g", yield: "41.5g", time: "24.2s", rating: "6.2", pressure: "9-bar flat", date: "2026-05-30 14:15", status: "Channeling" },
];

export default function ExtractionLogsPage() {
  const [filter, setFilter] = useState("All");

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Optimal":
        return <span className="px-2.5 py-1 rounded bg-accent-green/10 border border-accent-green/30 text-accent-green text-[11px] font-bold">Optimal</span>;
      case "Balanced":
        return <span className="px-2.5 py-1 rounded bg-brass/10 border border-brass/30 text-brass text-[11px] font-bold">Balanced</span>;
      case "Uneven Flow":
        return <span className="px-2.5 py-1 rounded bg-accent-amber/10 border border-accent-amber/30 text-accent-amber text-[11px] font-bold">Uneven Flow</span>;
      default:
        return <span className="px-2.5 py-1 rounded bg-accent-red/10 border border-accent-red/30 text-accent-red text-[11px] font-bold">Channeling</span>;
    }
  };

  const filteredLogs = filter === "All" 
    ? MOCK_LOGS 
    : MOCK_LOGS.filter(log => log.status === filter);

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-brass hover:text-brass-light transition font-medium mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </Link>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Extraction History Logs</h2>
          <p className="text-sm text-titanium mt-1">Browse, inspect, and analyze historical espresso recipes and CV diagnostics.</p>
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-2 bg-background-card/45 p-1.5 rounded-xl border border-white/5 backdrop-blur-md">
          <Filter className="w-4 h-4 text-titanium ml-2" />
          {["All", "Optimal", "Balanced", "Uneven Flow", "Channeling"].map((statusOpt) => (
            <button
              key={statusOpt}
              onClick={() => setFilter(statusOpt)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-300 ${
                filter === statusOpt
                  ? "bg-coffee text-white shadow-glow border border-brass/25"
                  : "text-titanium hover:text-white"
              }`}
            >
              {statusOpt}
            </button>
          ))}
        </div>
      </div>

      {/* Logs Table Container */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-background/50 text-titanium uppercase font-bold tracking-wider text-[10px]">
                <th className="p-4">Date</th>
                <th className="p-4">Coffee Bean & Roaster</th>
                <th className="p-4 text-center">Ratio</th>
                <th className="p-4 text-center">Time</th>
                <th className="p-4 text-center">Pressure</th>
                <th className="p-4 text-center">Rating</th>
                <th className="p-4 text-center">Diagnostics</th>
                <th className="p-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-white/[0.02] transition-colors duration-200">
                  <td className="p-4 text-titanium-light whitespace-nowrap font-mono">{log.date}</td>
                  <td className="p-4">
                    <p className="font-bold text-white text-sm">{log.bean}</p>
                    <p className="text-[10px] text-titanium mt-0.5">{log.roaster}</p>
                  </td>
                  <td className="p-4 text-center whitespace-nowrap font-medium text-white">
                    {log.dose} → {log.yield}
                  </td>
                  <td className="p-4 text-center whitespace-nowrap font-semibold text-white">{log.time}</td>
                  <td className="p-4 text-center text-titanium truncate max-w-[180px]" title={log.pressure}>
                    {log.pressure}
                  </td>
                  <td className="p-4 text-center font-bold text-brass">{log.rating}/10</td>
                  <td className="p-4 text-center whitespace-nowrap">{getStatusBadge(log.status)}</td>
                  <td className="p-4 text-center whitespace-nowrap">
                    <Link 
                      href="/"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-background rounded-lg border border-white/5 text-brass hover:border-brass/30 transition text-[11px]"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Details</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredLogs.length === 0 && (
          <div className="p-12 text-center text-titanium border-t border-white/5 space-y-2">
            <Sliders className="w-12 h-12 text-coffee-light/40 mx-auto" />
            <p className="font-bold text-white">No matching extraction logs found</p>
            <p className="text-xs">Adjust your diagnostic filters to search and retrieve older brews.</p>
          </div>
        )}
      </div>
    </div>
  );
}
