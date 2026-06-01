"use client";

import React, { useState } from "react";
import { Coffee, Search, Flame, Sliders, ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";

const MOCK_BEANS_CATALOG = [
  { id: 1, name: "Ethiopia Yirgacheffe Kochere", roaster: "Blueprint Coffee", roast_level: "Light", origin: "Ethiopia", notes: "Jasmine, Lemon Zest, Peach tea", roast_date: "2026-05-24", temp: "202°F", ratio: "1:2.1", flow: "Fast (CLIP Vision recommended)" },
  { id: 2, name: "Monolith Espresso Blend", roaster: "Onyx Coffee Lab", roast_level: "Medium-Dark", origin: "Colombia & Ethiopia", notes: "Brown Sugar, Cocoa, Berries", roast_date: "2026-05-20", temp: "198°F", ratio: "1:2.0", flow: "Standard/Slow" },
  { id: 3, name: "Gesha Village Lot 42", roaster: "Proud Mary", roast_level: "Light", origin: "Ethiopia", notes: "Bergamot, Orange Blossom, Honey", roast_date: "2026-05-28", temp: "204°F", ratio: "1:2.2", flow: "Custom Flow-Profile" },
  { id: 4, name: "El Paraiso Double Anaerobic", roaster: "Manhattan Coffee Roasters", roast_level: "Medium-Light", origin: "Colombia", notes: "Red fruit, Cinnamon, Passionfruit", roast_date: "2026-05-22", temp: "200°F", ratio: "1:2.1", flow: "Fast" },
  { id: 5, name: "Suke Quto", roaster: "Tim Wendelboe", roast_level: "Light", origin: "Ethiopia", notes: "Bergamot, Citrus, Floral", roast_date: "2026-05-18", temp: "202°F", ratio: "1:2.2", flow: "Fast" },
];

export default function BeanDatabasePage() {
  const [search, setSearch] = useState("");

  const filteredBeans = MOCK_BEANS_CATALOG.filter(
    (bean) =>
      bean.name.toLowerCase().includes(search.toLowerCase()) ||
      bean.roaster.toLowerCase().includes(search.toLowerCase()) ||
      bean.origin.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-brass hover:text-brass-light transition font-medium mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </Link>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Bean Database Catalog</h2>
          <p className="text-sm text-titanium mt-1">Manage single-origins, blends, roast dates, and custom extraction parameters.</p>
        </div>

        {/* Add Bean / Search bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-grow sm:w-64">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-titanium" />
            <input
              type="text"
              placeholder="Search origin, name, roaster..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-background-card/45 placeholder-titanium/50 pl-10 pr-4 py-2 text-xs rounded-xl border border-white/5 focus:outline-none focus:border-brass/50 focus:shadow-glow text-white"
            />
          </div>
          <button className="btn-brass inline-flex items-center gap-1.5 text-xs font-semibold py-2">
            <Plus className="w-4 h-4" />
            <span>Add Bean</span>
          </button>
        </div>
      </div>

      {/* Beans Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBeans.map((bean) => (
          <div key={bean.id} className="glass-card p-5 space-y-4 relative overflow-hidden flex flex-col justify-between h-full">
            {/* Background gold pulse */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-brass/5 rounded-full blur-2xl pointer-events-none"></div>

            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold text-brass uppercase tracking-wider">{bean.origin}</span>
                  <h3 className="text-lg font-bold text-white leading-tight mt-0.5">{bean.name}</h3>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-coffee-deep border border-brass/10 text-brass font-bold whitespace-nowrap">
                  {bean.roast_level}
                </span>
              </div>

              <div>
                <p className="text-[11px] text-titanium">Roaster</p>
                <p className="text-sm font-semibold text-white">{bean.roaster}</p>
              </div>

              <div className="p-3 rounded-lg bg-background/50 border border-white/5 space-y-1">
                <span className="text-[10px] text-titanium font-semibold">Tasting Profile</span>
                <p className="text-xs text-titanium-light leading-relaxed">{bean.notes}</p>
              </div>

              {/* Extraction targets details */}
              <div className="grid grid-cols-3 gap-2 text-[10px] pt-1">
                <div className="p-2 rounded bg-background border border-white/5 text-center">
                  <span className="text-titanium">Temp Target</span>
                  <p className="font-bold text-white mt-0.5">{bean.temp}</p>
                </div>
                <div className="p-2 rounded bg-background border border-white/5 text-center">
                  <span className="text-titanium">Ratio Target</span>
                  <p className="font-bold text-white mt-0.5">{bean.ratio}</p>
                </div>
                <div className="p-2 rounded bg-background border border-white/5 text-center flex flex-col justify-between">
                  <span className="text-titanium">Flow Speed</span>
                  <p className="font-bold text-brass mt-0.5 truncate" title={bean.flow}>{bean.flow}</p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/5 flex items-center justify-between text-[11px]">
              <span className="text-titanium">Roast Date: <span className="font-mono text-white">{bean.roast_date}</span></span>
              <Link href="/" className="text-brass font-bold hover:text-brass-light transition">
                Brew Now &rarr;
              </Link>
            </div>
          </div>
        ))}
      </div>

      {filteredBeans.length === 0 && (
        <div className="glass-card p-12 text-center text-titanium space-y-2">
          <Coffee className="w-12 h-12 text-coffee-light/40 mx-auto" />
          <p className="font-bold text-white">No cataloged coffee beans found</p>
          <p className="text-xs">Adjust your search parameters or add a new coffee bean to catalog your roast inventory.</p>
        </div>
      )}
    </div>
  );
}
