import React from "react";
import { Github, Heart, Cpu } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-white/5 bg-background-card/20 py-8 mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-titanium">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-brass" />
          <span>EspressoLens v0.1.0 • Modern Intelligent Extraction Diagnostic Stack</span>
        </div>
        <div className="flex items-center gap-1">
          <span>Made for coffee geeks with</span>
          <Heart className="w-3.5 h-3.5 text-accent-red fill-accent-red mx-0.5" />
          <span>using Next.js & FastAPI</span>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="http://localhost:8000/docs"
            target="_blank"
            rel="noreferrer"
            className="hover:text-white transition"
          >
            API Spec
          </a>
          <a
            href="http://localhost:6333/dashboard"
            target="_blank"
            rel="noreferrer"
            className="hover:text-white transition"
          >
            Qdrant Console
          </a>
        </div>
      </div>
    </footer>
  );
}
