"use client";

import React from "react";
import { Coffee, Search, Cpu, Database, Eye } from "lucide-react";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-background/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-coffee to-brass p-2 rounded-xl border border-brass/30 shadow-glow">
            <Coffee className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-1">
              Espresso<span className="text-brass">Lens</span>
            </h1>
            <p className="text-[10px] text-titanium leading-none">Extraction Frame Intelligence</p>
          </div>
        </div>

        {/* Navigation / Service status indicator */}
        <nav className="hidden md:flex items-center gap-6 text-sm">
          <a href="#" className="text-white hover:text-brass transition">Dashboard</a>
          <a href="#" className="text-titanium hover:text-white transition">Extraction Logs</a>
          <a href="#" className="text-titanium hover:text-white transition">Bean Database</a>
        </nav>

        {/* Status badges */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-coffee-deep border border-brass/10 text-xs text-brass font-medium">
            <Eye className="w-3.5 h-3.5" />
            <span>CLIP Vision</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-coffee-deep border border-brass/10 text-xs text-brass font-medium">
            <Database className="w-3.5 h-3.5" />
            <span>Qdrant Active</span>
          </div>
        </div>
      </div>
    </header>
  );
}
