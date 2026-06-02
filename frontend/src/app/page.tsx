"use client";

import React, { useState } from "react";
import { 
  Flame, 
  Activity, 
  Search, 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  UploadCloud, 
  Sliders, 
  TrendingUp, 
  Tv,
  Check,
  Eye,
  RefreshCw
} from "lucide-react";

// Mock data representing database records we'd retrieve from PostgreSQL and Qdrant
const MOCK_BEANS = [
  { id: 1, name: "Ethiopia Yirgacheffe Kochere", roaster: "Blueprint Coffee", roast_level: "Light", origin: "Ethiopia", notes: "Jasmine, Lemon Zest, Peach tea" },
  { id: 2, name: "Monolith Espresso Blend", roaster: "Onyx Coffee Lab", roast_level: "Medium-Dark", origin: "Colombia & Ethiopia", notes: "Brown Sugar, Cocoa, Berries" },
];

const MOCK_EXTRACTIONS = [
  { id: 1, bean_id: 1, dose: 18.0, yield: 38.2, time: 27.5, rating: 8.5, pressure: "9-bar flat", notes: "Slightly fast flow but very high sweetness. Minor channeling at 12s." },
  { id: 2, bean_id: 2, dose: 20.0, yield: 40.0, time: 31.2, rating: 9.2, pressure: "6-bar pre-infusion, peak 9-bar", notes: "Incredible syrupy mouthfeel. Beautiful crema tiger-striping." },
];

const MOCK_FRAMES = [
  { id: 101, extraction_id: 1, timestamp: 4.20, channeling: false, uneven_flow: true, crema: 0.72, point_id: "e34a78bc-ad90-410a-9d62-fb590a36412b", description: "Pre-infusion wet spots emerging unevenly across basket" },
  { id: 102, extraction_id: 1, timestamp: 12.80, channeling: true, uneven_flow: true, crema: 0.58, point_id: "c458a2bf-230d-45db-99ea-4cfb92d6e301", description: "High velocity micro-channel spraying on bottom-left quadrant" },
  { id: 103, extraction_id: 2, timestamp: 15.40, channeling: false, uneven_flow: false, crema: 0.95, point_id: "8c31ab00-ee71-46ab-85a2-c74cb1e220e3", description: "Beautiful solid single-stream cone formation, deep tiger-striping" },
  { id: 104, extraction_id: 2, timestamp: 24.00, channeling: false, uneven_flow: false, crema: 0.88, point_id: "fa32b50c-e2d9-43c3-bfa4-106d396996bf", description: "Late-extraction blonding onset, standard flow speed" },
];

// Semantic search mock results matching visual query intentions
const SEMANTIC_QUERIES = [
  {
    intent: "Severe Channeling & Basket Spraying",
    results: [
      { score: 0.965, frame_id: 102, timestamp: 12.80, extraction: "Ethiopia Yirgacheffe (#1)", status: "Channeling Detected", color: "text-accent-red" },
      { score: 0.841, frame_id: 101, timestamp: 4.20, extraction: "Ethiopia Yirgacheffe (#1)", status: "Uneven Pre-infusion", color: "text-accent-amber" }
    ]
  },
  {
    intent: "Perfect Extraction Cone (Tiger-Striping)",
    results: [
      { score: 0.982, frame_id: 103, timestamp: 15.40, extraction: "Monolith Espresso Blend (#2)", status: "Optimal Crema Quality", color: "text-accent-green" },
      { score: 0.897, frame_id: 104, timestamp: 24.00, extraction: "Monolith Espresso Blend (#2)", status: "Normal Blonding Phase", color: "text-titanium" }
    ]
  }
];

export default function Dashboard() {
  const [selectedBean, setSelectedBean] = useState(MOCK_BEANS[0]);
  const [selectedExtraction, setSelectedExtraction] = useState(MOCK_EXTRACTIONS[0]);
  const [activeQueryIndex, setActiveQueryIndex] = useState<number | null>(null);
  const [customVectorInput, setCustomVectorInput] = useState("");
  const [vectorResults, setVectorResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleUpload = async () => {
    if (!uploadedFile) return;
    setIsUploading(true);
    setUploadError(null);
    setUploadResult(null);

    const formData = new FormData();
    formData.append("file", uploadedFile);

    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    try {
      const res = await fetch(
        `${apiBase}/api/v1/extractions/${selectedExtraction.id}/upload-file`,
        { method: "POST", body: formData }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Upload failed (${res.status})`);
      }
      const data = await res.json();
      setUploadResult(data[0]);
      setUploadedFile(null);
    } catch (e: any) {
      setUploadError(e.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSemanticSearch = (index: number) => {
    setIsSearching(true);
    setActiveQueryIndex(index);
    setTimeout(() => {
      setVectorResults(SEMANTIC_QUERIES[index].results);
      setIsSearching(false);
    }, 600);
  };

  const handleCustomVectorSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customVectorInput.trim()) return;
    setIsSearching(true);
    setTimeout(() => {
      // Return a dynamic set of results representing a random search
      setVectorResults([
        { score: 0.912, frame_id: 103, timestamp: 15.40, extraction: "Monolith Espresso Blend (#2)", status: "Similar Flow Profile", color: "text-accent-green" },
        { score: 0.768, frame_id: 101, timestamp: 4.20, extraction: "Ethiopia Yirgacheffe (#1)", status: "Anomalous Pre-infusion", color: "text-accent-amber" }
      ]);
      setIsSearching(false);
    }, 800);
  };

  return (
    <div className="space-y-8">
      {/* Upload Drop Zone */}
      <section className="glass-card p-5 relative overflow-hidden">
        {/* Drop target */}
        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
            dragOver ? "border-brass/60 bg-brass/5" : "border-white/10 hover:border-white/20"
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files[0];
            if (file) { setUploadedFile(file); setUploadResult(null); setUploadError(null); }
          }}
        >
          <UploadCloud className={`w-10 h-10 mx-auto mb-3 transition-colors duration-300 ${dragOver ? "text-brass" : "text-brass/50"}`} />
          <p className="text-white font-semibold text-sm">
            {uploadedFile ? uploadedFile.name : "Drop an extraction video or image here"}
          </p>
          <p className="text-titanium text-xs mt-1">
            {uploadedFile
              ? `${(uploadedFile.size / 1024 / 1024).toFixed(2)} MB · ${uploadedFile.type || "unknown type"}`
              : "Supports MP4, MOV, JPG, JPEG, PNG and more"}
          </p>

          <div className="mt-4 flex items-center justify-center gap-3">
            <label className="inline-block cursor-pointer">
              <span className="btn-brass py-1.5 px-4 text-xs font-semibold">Browse files</span>
              <input
                type="file"
                accept="video/*,image/*,.jpg,.jpeg,.png"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) { setUploadedFile(file); setUploadResult(null); setUploadError(null); }
                }}
              />
            </label>

            {uploadedFile && !isUploading && (
              <>
                <button
                  onClick={handleUpload}
                  className="flex items-center gap-1.5 bg-coffee border border-brass/40 text-white text-xs font-semibold py-1.5 px-4 rounded-lg hover:bg-coffee-light hover:border-brass transition-all duration-300"
                >
                  <Check className="w-3.5 h-3.5 text-brass" />
                  Analyze with AI
                </button>
                <button
                  onClick={() => { setUploadedFile(null); setUploadError(null); }}
                  className="text-xs text-titanium hover:text-white transition"
                >
                  Clear
                </button>
              </>
            )}

            {isUploading && (
              <span className="flex items-center gap-1.5 text-xs text-brass font-medium">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Uploading & embedding…
              </span>
            )}
          </div>
        </div>

        {/* Upload error */}
        {uploadError && (
          <div className="mt-3 flex items-center gap-2 p-3 rounded-lg bg-accent-red/10 border border-accent-red/20 text-xs text-accent-red">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}

        {/* Upload result */}
        {uploadResult && (
          <div className="mt-3 p-4 rounded-xl bg-background/70 border border-accent-green/20 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-accent-green">
              <CheckCircle className="w-4 h-4" />
              Frame indexed successfully
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="p-2 rounded-lg bg-background border border-white/5 text-center">
                <span className="text-titanium text-[10px]">Channeling</span>
                <p className={`font-bold mt-0.5 ${uploadResult.detected_channeling ? "text-accent-red" : "text-accent-green"}`}>
                  {uploadResult.detected_channeling ? "Detected" : "None"}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-background border border-white/5 text-center">
                <span className="text-titanium text-[10px]">Flow</span>
                <p className={`font-bold mt-0.5 ${uploadResult.detected_uneven_flow ? "text-accent-amber" : "text-accent-green"}`}>
                  {uploadResult.detected_uneven_flow ? "Uneven" : "Balanced"}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-background border border-white/5 text-center">
                <span className="text-titanium text-[10px]">Crema</span>
                <p className="font-bold text-brass mt-0.5">
                  {Math.round((uploadResult.crema_quality_rating ?? 0) * 100)}%
                </p>
              </div>
            </div>
            <p className="text-[10px] text-titanium truncate" title={uploadResult.qdrant_point_id}>
              Qdrant ID: {uploadResult.qdrant_point_id}
            </p>
          </div>
        )}
      </section>

      {/* Hero Section */}
      <section className="glass-card p-6 md:p-8 relative overflow-hidden">
        {/* Decorative corner glows */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-brass/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-coffee/10 rounded-full blur-3xl -ml-24 -mb-24 pointer-events-none"></div>

        <div className="relative z-10 grid md:grid-cols-3 gap-6 items-center">
          <div className="md:col-span-2 space-y-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brass/10 border border-brass/30 text-xs font-semibold text-brass">
              <Flame className="w-3.5 h-3.5" />
              Intelligence Layer Active
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Visualize Coffee Extraction. <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brass via-coffee-light to-brass">
                Diagnose Extraction Anomalies.
              </span>
            </h2>
            <p className="text-sm md:text-base text-titanium max-w-xl">
              EspressoLens connects real-time video analytics of bottomless portafilter extractions with deep sensory coffee profiles, powering vector searches to match shot characteristics over high-dimensional CLIP frame embeddings.
            </p>
          </div>
          <div className="flex flex-col gap-3 md:border-l border-white/5 md:pl-6">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-4 h-4 text-brass" /> Active Diagnostics
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-background border border-white/5">
                <span className="text-titanium">Avg Flow Score</span>
                <p className="text-lg font-bold text-white mt-0.5">8.9/10</p>
              </div>
              <div className="p-2.5 rounded-lg bg-background border border-white/5">
                <span className="text-titanium">Channeling Rate</span>
                <p className="text-lg font-bold text-accent-red mt-0.5">4.2%</p>
              </div>
              <div className="p-2.5 rounded-lg bg-background border border-white/5">
                <span className="text-titanium">Crema Standard</span>
                <p className="text-lg font-bold text-accent-green mt-0.5">Optimal</p>
              </div>
              <div className="p-2.5 rounded-lg bg-background border border-white/5">
                <span className="text-titanium">Indexed Vectors</span>
                <p className="text-lg font-bold text-brass mt-0.5">14,282</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Grid containing Beans & Extractions along with Qdrant Search */}
      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* Left Column: SQLModel Relational Layer */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Row 1: Bean & Extraction Selector */}
          <div className="grid md:grid-cols-2 gap-6">
            
            {/* Beans list */}
            <div className="glass-card p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <h3 className="font-bold text-white flex items-center gap-2 text-sm">
                  <span className="w-2.5 h-2.5 rounded-full bg-brass shadow-glow"></span>
                  Coffee Bean Profiles (SQLModel)
                </h3>
                <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-titanium">PostgreSQL</span>
              </div>
              
              <div className="space-y-2">
                {MOCK_BEANS.map((bean) => (
                  <button
                    key={bean.id}
                    onClick={() => {
                      setSelectedBean(bean);
                      // Auto-select corresponding extraction run if exists
                      const match = MOCK_EXTRACTIONS.find(e => e.bean_id === bean.id);
                      if (match) setSelectedExtraction(match);
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition-all duration-300 ${
                      selectedBean.id === bean.id
                        ? "bg-coffee/15 border-brass/50 text-white"
                        : "bg-background/40 border-white/5 text-titanium hover:bg-background-hover hover:text-white"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-semibold text-xs">{bean.roaster}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/30 border border-white/5 text-brass">
                        {bean.roast_level}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold mt-1 text-white">{bean.name}</h4>
                    <p className="text-[10px] text-titanium mt-1 truncate">Notes: {bean.notes}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Selected Bean details + Extraction parameters */}
            <div className="glass-card p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <h3 className="font-bold text-white flex items-center gap-2 text-sm">
                  <Activity className="w-4 h-4 text-brass" />
                  Recipe Parameters
                </h3>
                <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-titanium">PostgreSQL</span>
              </div>

              <div className="space-y-3.5 text-xs">
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-background/80 p-2 rounded-lg border border-white/5 text-center">
                    <span className="text-titanium text-[10px]">Dose</span>
                    <p className="font-bold text-white mt-0.5 text-sm">{selectedExtraction.dose}g</p>
                  </div>
                  <div className="bg-background/80 p-2 rounded-lg border border-white/5 text-center">
                    <span className="text-titanium text-[10px]">Yield</span>
                    <p className="font-bold text-white mt-0.5 text-sm">{selectedExtraction.yield}g</p>
                  </div>
                  <div className="bg-background/80 p-2 rounded-lg border border-white/5 text-center">
                    <span className="text-titanium text-[10px]">Time</span>
                    <p className="font-bold text-white mt-0.5 text-sm">{selectedExtraction.time}s</p>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-coffee-deep border border-brass/10">
                  <div className="flex justify-between text-[10px] font-semibold text-brass mb-1">
                    <span>Pressure Settings</span>
                    <span>Rating: {selectedExtraction.rating}/10</span>
                  </div>
                  <p className="text-white font-medium text-xs">{selectedExtraction.pressure}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-titanium font-semibold">Tasting Sensory Notes</span>
                  <p className="p-2.5 rounded bg-background/50 border border-white/5 text-titanium-light leading-normal">
                    {selectedExtraction.notes}
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* Row 2: Analyzed Video Frames Timeline */}
          <div className="glass-card p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <Tv className="w-4 h-4 text-brass" />
                <h3 className="font-bold text-white text-sm">Analyzed Extraction Video Frames</h3>
              </div>
              <span className="text-[10px] text-brass border border-brass/30 px-2 py-0.5 rounded bg-brass/5">
                Linked via Qdrant Point ID
              </span>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {MOCK_FRAMES.filter(f => f.extraction_id === selectedExtraction.id).map((frame) => (
                <div key={frame.id} className="p-4 rounded-xl bg-background/70 border border-white/5 space-y-3 hover:border-white/15 transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white bg-coffee/20 px-2.5 py-0.5 rounded-full">
                      T +{frame.timestamp.toFixed(2)}s
                    </span>
                    <div className="flex gap-1.5">
                      {frame.channeling ? (
                        <span className="flex items-center gap-0.5 text-[10px] font-bold text-accent-red px-1.5 py-0.5 bg-accent-red/10 border border-accent-red/20 rounded">
                          <AlertTriangle className="w-3 h-3" /> Channel
                        </span>
                      ) : (
                        <span className="flex items-center gap-0.5 text-[10px] font-bold text-accent-green px-1.5 py-0.5 bg-accent-green/10 border border-accent-green/20 rounded">
                          <CheckCircle className="w-3 h-3" /> No Spray
                        </span>
                      )}

                      {frame.uneven_flow ? (
                        <span className="text-[10px] font-bold text-accent-amber px-1.5 py-0.5 bg-accent-amber/10 border border-accent-amber/20 rounded">
                          Uneven Flow
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-accent-green px-1.5 py-0.5 bg-accent-green/10 border border-accent-green/20 rounded">
                          Balanced
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-titanium leading-relaxed">{frame.description}</p>

                  <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[9px]">
                    <span className="text-titanium font-semibold truncate max-w-[140px]" title={frame.point_id}>
                      Qdrant ID: {frame.point_id}
                    </span>
                    <span className="text-brass">Crema Quality: {Math.round(frame.crema * 100)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: Qdrant Vector Semantic Search Engine Console */}
        <div className="space-y-6">
          <div className="glass-card p-5 space-y-5 relative overflow-hidden">
            {/* Background glowing indicator */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-brass/5 rounded-full blur-2xl"></div>

            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="font-bold text-white flex items-center gap-2 text-sm">
                <Search className="w-4 h-4 text-brass" />
                Qdrant Semantic Search
              </h3>
              <span className="text-[10px] bg-brass/10 px-2 py-0.5 rounded text-brass border border-brass/20">
                Vector DB
              </span>
            </div>

            <p className="text-xs text-titanium leading-relaxed">
              Query the high-dimensional vector space mapped by our extraction vision AI model. Find matching visual conditions across all historical brews.
            </p>

            {/* Quick Intent Selectors */}
            <div className="space-y-2">
              <label className="text-[10px] text-titanium uppercase font-bold tracking-wider">
                Select visual semantic intent query:
              </label>
              <div className="flex flex-col gap-2">
                {SEMANTIC_QUERIES.map((query, index) => (
                  <button
                    key={index}
                    onClick={() => handleSemanticSearch(index)}
                    className={`w-full text-left p-3 text-xs rounded-xl border flex items-center justify-between transition-all duration-300 ${
                      activeQueryIndex === index
                        ? "bg-coffee/20 border-brass text-white shadow-glow"
                        : "bg-background border-white/5 text-titanium hover:bg-background-hover hover:text-white"
                    }`}
                  >
                    <span>{query.intent}</span>
                    <Eye className="w-4 h-4 text-brass/70" />
                  </button>
                ))}
              </div>
            </div>

            {/* Custom vector input simulator */}
            <form onSubmit={handleCustomVectorSearch} className="space-y-2 pt-2 border-t border-white/5">
              <label className="text-[10px] text-titanium uppercase font-bold tracking-wider block">
                Simulate custom vector query (512-dim embedding):
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. [0.124, -0.098, 0.443, ...]"
                  value={customVectorInput}
                  onChange={(e) => setCustomVectorInput(e.target.value)}
                  className="flex-grow bg-background text-white placeholder-titanium/50 px-3 py-2 text-xs rounded-lg border border-white/10 focus:outline-none focus:border-brass/50 focus:shadow-glow"
                />
                <button
                  type="submit"
                  className="bg-coffee p-2 rounded-lg border border-brass/30 text-white hover:bg-coffee-light transition-all duration-300"
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>
            </form>

            {/* Semantic search console results */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[10px] text-titanium uppercase font-bold tracking-wider">
                <span>Vector search matches</span>
                {isSearching && (
                  <RefreshCw className="w-3 h-3 animate-spin text-brass" />
                )}
              </div>

              {vectorResults.length > 0 ? (
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {vectorResults.map((res, i) => (
                    <div key={i} className="p-3 rounded-lg bg-background border border-white/5 flex items-center justify-between text-xs transition-all duration-300 hover:border-white/15">
                      <div className="space-y-0.5">
                        <p className="font-semibold text-white text-[11px]">{res.extraction}</p>
                        <div className="flex items-center gap-1.5 text-[10px] text-titanium">
                          <span>Frame T+{res.timestamp.toFixed(2)}s</span>
                          <span>•</span>
                          <span className={`font-semibold ${res.color}`}>{res.status}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-mono text-brass font-bold">
                          {Math.round(res.score * 1000) / 1000}
                        </span>
                        <p className="text-[9px] text-titanium leading-none">Similarity</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 rounded-lg bg-background/50 border border-dashed border-white/10 text-center text-xs text-titanium">
                  Select a query intent above or submit a custom mock vector to simulate semantic results retrieved from Qdrant.
                </div>
              )}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
