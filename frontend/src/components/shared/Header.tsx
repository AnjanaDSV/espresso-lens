"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Coffee, Database, Eye, X, Cpu, Server, Activity, ShieldCheck, Sliders } from "lucide-react";

export default function Header() {
  const pathname = usePathname();
  const [isClipModalOpen, setIsClipModalOpen] = useState(false);

  const isLinkActive = (path: string) => {
    return pathname === path;
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition">
            <div className="bg-gradient-to-br from-coffee to-brass p-2 rounded-xl border border-brass/30 shadow-glow">
              <Coffee className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-1">
                Espresso<span className="text-brass">Lens</span>
              </h1>
              <p className="text-[10px] text-titanium leading-none">Extraction Frame Intelligence</p>
            </div>
          </Link>

          {/* Navigation / Client router links */}
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link
              href="/"
              className={`transition font-medium ${
                isLinkActive("/") ? "text-brass font-semibold" : "text-titanium hover:text-white"
              }`}
            >
              Dashboard
            </Link>
            <Link
              href="/extraction-logs"
              className={`transition font-medium ${
                isLinkActive("/extraction-logs") ? "text-brass font-semibold" : "text-titanium hover:text-white"
              }`}
            >
              Extraction Logs
            </Link>
            <Link
              href="/bean-database"
              className={`transition font-medium ${
                isLinkActive("/bean-database") ? "text-brass font-semibold" : "text-titanium hover:text-white"
              }`}
            >
              Bean Database
            </Link>
          </nav>

          {/* Status badges */}
          <div className="flex items-center gap-3">
            {/* Interactive CLIP Vision Button */}
            <button
              onClick={() => setIsClipModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-coffee-deep border border-brass/30 text-xs text-brass font-medium hover:bg-coffee/35 hover:border-brass hover:shadow-glow transition-all duration-300 active:scale-[0.97]"
              title="Click to view AI Pipeline metrics"
            >
              <Eye className="w-3.5 h-3.5 animate-pulse text-brass" />
              <span>CLIP Vision</span>
            </button>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-coffee-deep border border-brass/10 text-xs text-brass font-medium">
              <Database className="w-3.5 h-3.5" />
              <span>Qdrant Active</span>
            </div>
          </div>
        </div>
      </header>

      {/* CLIP Vision AI Pipeline Modal */}
      {isClipModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fadeIn"
          onClick={() => setIsClipModalOpen(false)}
        >
          <div 
            className="glass-card w-full max-w-md p-6 relative bg-background-card/95 border border-white/10 shadow-glass animate-scaleUp"
            onClick={(e) => e.stopPropagation()} // Prevent click-outside closure when clicking inside the card
          >
            {/* Close button */}
            <button
              onClick={() => setIsClipModalOpen(false)}
              className="absolute top-4 right-4 text-titanium hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-2.5 border-b border-white/5 pb-3.5 mb-5">
              <div className="bg-brass/10 p-2 rounded-lg border border-brass/30">
                <Eye className="w-5 h-5 text-brass" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white leading-none">AI Pipeline Intelligence</h3>
                <p className="text-[10px] text-titanium mt-1">Operational specifications and neural networks configuration</p>
              </div>
            </div>

            {/* Neural Network Specs Grid */}
            <div className="space-y-4 text-xs">
              
              <div className="p-4 rounded-xl bg-background/65 border border-white/5 space-y-3.5">
                <div className="flex items-start gap-3">
                  <Server className="w-4 h-4 text-brass mt-0.5" />
                  <div>
                    <span className="text-[10px] text-titanium uppercase font-bold tracking-wider">Model Identifier</span>
                    <p className="font-bold text-white text-sm mt-0.5">CLIP (ViT-B/32)</p>
                    <p className="text-[10px] text-titanium mt-0.5">Visual-textual transformer optimized for high-speed frame feature extraction.</p>
                  </div>
                </div>

                <div className="h-px bg-white/5"></div>

                <div className="flex items-start gap-3">
                  <Activity className="w-4 h-4 text-brass mt-0.5" />
                  <div>
                    <span className="text-[10px] text-titanium uppercase font-bold tracking-wider">Feature Dimensions</span>
                    <p className="font-bold text-white text-sm mt-0.5">512-dimensional vector space</p>
                    <p className="text-[10px] text-titanium mt-0.5">Dense visual embedding arrays normalized to L2 unit length.</p>
                  </div>
                </div>

                <div className="h-px bg-white/5"></div>

                <div className="flex items-start gap-3">
                  <Sliders className="w-4 h-4 text-brass mt-0.5" />
                  <div>
                    <span className="text-[10px] text-titanium uppercase font-bold tracking-wider">Latent Metric</span>
                    <p className="font-bold text-white text-sm mt-0.5">Cosine Similarity</p>
                    <p className="text-[10px] text-titanium mt-0.5">Optimal measurement of vector direction overlap inside Qdrant index space.</p>
                  </div>
                </div>

                <div className="h-px bg-white/5"></div>

                <div className="flex items-start gap-3">
                  <Cpu className="w-4 h-4 text-brass mt-0.5" />
                  <div>
                    <span className="text-[10px] text-titanium uppercase font-bold tracking-wider">Hardware Acceleration</span>
                    <p className="font-bold text-white text-sm mt-0.5">CPU (WSL Virtualization)</p>
                    <p className="text-[10px] text-titanium mt-0.5">Threaded processing optimized for low latency frame classification.</p>
                  </div>
                </div>
              </div>

              {/* Status bar */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-coffee-deep border border-brass/10 text-[10px]">
                <div className="flex items-center gap-1.5 text-brass font-semibold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Pipeline Signature Verified</span>
                </div>
                <span className="text-accent-green font-bold">ACTIVE</span>
              </div>

              {/* Dismiss Button */}
              <div className="pt-2 border-t border-white/5 flex justify-end">
                <button
                  onClick={() => setIsClipModalOpen(false)}
                  className="btn-brass py-2 px-5 text-xs font-semibold"
                >
                  Dismiss
                </button>
              </div>

            </div>

          </div>
        </div>
      )}
    </>
  );
}
