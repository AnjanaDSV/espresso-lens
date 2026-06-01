"use client";

import React, { useState, useEffect } from "react";
import { Coffee, Search, Flame, Sliders, ArrowLeft, Plus, X, RefreshCw, Check } from "lucide-react";
import Link from "next/link";

interface BeanRecord {
  id: number;
  name: string;
  roaster: string;
  roast_level: string;
  origin: string;
  notes: string;
  roast_date?: string;
  temp?: string;
  ratio?: string;
  flow?: string;
}

// Fallback catalog if backend is not seeded or connection is lost
const FALLBACK_BEANS: BeanRecord[] = [
  { id: 1, name: "Ethiopia Yirgacheffe Kochere", roaster: "Blueprint Coffee", roast_level: "Light", origin: "Ethiopia", notes: "Jasmine, Lemon Zest, Peach tea", roast_date: "2026-05-24", temp: "202°F", ratio: "1:2.1", flow: "Fast" },
  { id: 2, name: "Monolith Espresso Blend", roaster: "Onyx Coffee Lab", roast_level: "Medium-Dark", origin: "Colombia & Ethiopia", notes: "Brown Sugar, Cocoa, Berries", roast_date: "2026-05-20", temp: "198°F", ratio: "1:2.0", flow: "Standard/Slow" },
  { id: 3, name: "Gesha Village Lot 42", roaster: "Proud Mary", roast_level: "Light", origin: "Ethiopia", notes: "Bergamot, Orange Blossom, Honey", roast_date: "2026-05-28", temp: "204°F", ratio: "1:2.2", flow: "Custom Flow" },
];

export default function BeanDatabasePage() {
  const [beans, setBeans] = useState<BeanRecord[]>([]);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Form states
  const [name, setName] = useState("");
  const [roaster, setRoaster] = useState("");
  const [origin, setOrigin] = useState("");
  const [roastLevel, setRoastLevel] = useState("Light");
  const [notes, setNotes] = useState("");

  const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  // Fetch all beans from the database on mount
  const fetchBeans = async () => {
    setIsLoading(true);
    setErrorMsg("");
    try {
      const response = await fetch(`${backendUrl}/api/v1/beans/`);
      if (response.ok) {
        const data = await response.json();
        // If PostgreSQL has beans, display them; otherwise seed from our defaults
        if (data.length > 0) {
          setBeans(data);
        } else {
          // No beans in DB yet, seed the UI with fallbacks
          setBeans(FALLBACK_BEANS);
        }
      } else {
        setBeans(FALLBACK_BEANS);
      }
    } catch (err) {
      console.warn("Backend connection failed, using local mock beans catalog:", err);
      setBeans(FALLBACK_BEANS);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBeans();
  }, []);

  const handleAddBeanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !roaster) {
      setErrorMsg("Name and Roaster are required fields.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    const newBeanPayload = {
      name,
      roaster,
      roast_level: roastLevel,
      origin: origin || "Single-Origin",
      notes: notes || "No tasting notes provided yet."
    };

    try {
      const response = await fetch(`${backendUrl}/api/v1/beans/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(newBeanPayload)
      });

      if (response.ok) {
        const createdBean = await response.json();
        
        // Add custom visual mock target tags for frontend display
        const enrichedBean: BeanRecord = {
          ...createdBean,
          roast_date: new Date().toISOString().split("T")[0],
          temp: roastLevel === "Light" ? "202°F" : roastLevel === "Medium" ? "200°F" : "198°F",
          ratio: roastLevel === "Light" ? "1:2.2" : "1:2.0",
          flow: roastLevel === "Light" ? "Fast" : "Standard"
        };

        // Prepend new bean to the state array so it immediately renders
        setBeans((prevBeans) => [enrichedBean, ...prevBeans]);
        
        // Reset form inputs & close modal
        setName("");
        setRoaster("");
        setOrigin("");
        setRoastLevel("Light");
        setNotes("");
        setIsModalOpen(false);
      } else {
        const errorData = await response.json();
        setErrorMsg(errorData.detail || "Failed to save coffee bean profile to backend.");
      }
    } catch (err) {
      console.error("Failed to POST new bean:", err);
      // Fallback: Add locally if backend is unreachable
      const mockCreatedBean: BeanRecord = {
        id: Date.now(),
        ...newBeanPayload,
        roast_date: new Date().toISOString().split("T")[0],
        temp: "200°F",
        ratio: "1:2.0",
        flow: "Standard"
      };
      setBeans((prevBeans) => [mockCreatedBean, ...prevBeans]);
      setIsModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredBeans = beans.filter(
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

        {/* Action Controls */}
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
          <button 
            onClick={() => setIsModalOpen(true)}
            className="btn-brass inline-flex items-center gap-1.5 text-xs font-semibold py-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Bean</span>
          </button>
        </div>
      </div>

      {/* Loading State indicator */}
      {isLoading ? (
        <div className="p-12 text-center text-titanium space-y-2">
          <RefreshCw className="w-8 h-8 animate-spin text-brass mx-auto" />
          <p className="text-xs">Loading coffee bean records from PostgreSQL...</p>
        </div>
      ) : (
        /* Beans Grid */
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
                    <p className="font-bold text-white mt-0.5">{bean.temp || "200°F"}</p>
                  </div>
                  <div className="p-2 rounded bg-background border border-white/5 text-center">
                    <span className="text-titanium">Ratio Target</span>
                    <p className="font-bold text-white mt-0.5">{bean.ratio || "1:2.0"}</p>
                  </div>
                  <div className="p-2 rounded bg-background border border-white/5 text-center flex flex-col justify-between">
                    <span className="text-titanium">Flow Speed</span>
                    <p className="font-bold text-brass mt-0.5 truncate" title={bean.flow || "Standard"}>
                      {bean.flow || "Standard"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/5 flex items-center justify-between text-[11px]">
                <span className="text-titanium">Roast Date: <span className="font-mono text-white">{bean.roast_date || "Recent"}</span></span>
                <Link href="/" className="text-brass font-bold hover:text-brass-light transition">
                  Brew Now &rarr;
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredBeans.length === 0 && (
        <div className="glass-card p-12 text-center text-titanium space-y-2">
          <Coffee className="w-12 h-12 text-coffee-light/40 mx-auto" />
          <p className="font-bold text-white">No cataloged coffee beans found</p>
          <p className="text-xs">Adjust your search parameters or click "Add Bean" to seed your inventory database.</p>
        </div>
      )}

      {/* Add Bean Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fadeIn">
          <div className="glass-card w-full max-w-md p-6 relative bg-background-card/95 border border-white/10 shadow-glass">
            
            {/* Close Button */}
            <button 
              onClick={() => {
                setIsModalOpen(false);
                setErrorMsg("");
              }}
              className="absolute top-4 right-4 text-titanium hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 border-b border-white/5 pb-3 mb-4">
              <Coffee className="w-5 h-5 text-brass" />
              <h3 className="text-lg font-bold text-white">Catalog Coffee Roast Profile</h3>
            </div>

            {errorMsg && (
              <div className="p-3 mb-4 rounded-lg bg-accent-red/10 border border-accent-red/20 text-accent-red text-xs">
                {errorMsg}
              </div>
            )}

            {/* Input Form */}
            <form onSubmit={handleAddBeanSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] text-titanium uppercase font-bold tracking-wider mb-1">
                  Coffee Bean Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Yirgacheffe Kochere"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-background placeholder-titanium/40 px-3.5 py-2.5 rounded-lg border border-white/5 focus:outline-none focus:border-brass/50 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] text-titanium uppercase font-bold tracking-wider mb-1">
                  Roaster Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Onyx Coffee Lab"
                  value={roaster}
                  onChange={(e) => setRoaster(e.target.value)}
                  className="w-full bg-background placeholder-titanium/40 px-3.5 py-2.5 rounded-lg border border-white/5 focus:outline-none focus:border-brass/50 text-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-titanium uppercase font-bold tracking-wider mb-1">
                    Country of Origin
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ethiopia"
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    className="w-full bg-background placeholder-titanium/40 px-3.5 py-2.5 rounded-lg border border-white/5 focus:outline-none focus:border-brass/50 text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-titanium uppercase font-bold tracking-wider mb-1">
                    Roast Level
                  </label>
                  <select
                    value={roastLevel}
                    onChange={(e) => setRoastLevel(e.target.value)}
                    className="w-full bg-background px-3 py-2.5 rounded-lg border border-white/5 focus:outline-none focus:border-brass/50 text-white"
                  >
                    <option value="Light">Light</option>
                    <option value="Medium">Medium</option>
                    <option value="Medium-Dark">Medium-Dark</option>
                    <option value="Dark">Dark</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-titanium uppercase font-bold tracking-wider mb-1">
                  Tasting Sensory Notes
                </label>
                <textarea
                  placeholder="e.g. Floral honeysuckle, sweet peach, crisp lemon acidity..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full bg-background placeholder-titanium/40 px-3.5 py-2.5 rounded-lg border border-white/5 focus:outline-none focus:border-brass/50 text-white resize-none"
                />
              </div>

              <div className="pt-2 border-t border-white/5 flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setErrorMsg("");
                  }}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-brass inline-flex items-center gap-1.5 py-2 px-5"
                >
                  {isSubmitting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>Save Bean</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
