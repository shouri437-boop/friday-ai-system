"use client";

import { useState } from "react";
import { 
  Compass, 
  ExternalLink, 
  RefreshCw
} from "lucide-react";

export default function Echo26Page() {
  const [iframeKey, setIframeKey] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const serverUrl = "http://localhost:5500/index.html";

  const handleRefresh = () => {
    setIsLoading(true);
    setIframeKey((prev) => prev + 1);
  };

  const handleOpenExternal = () => {
    window.open(serverUrl, "_blank");
  };

  return (
    <div className="flex flex-col h-full w-full relative bg-[#05020c] p-2 md:p-4 space-y-3 overflow-hidden font-['Rajdhani',sans-serif] text-[#d9f8ff]">
      {/* Background Ambient Glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse at 50% 32%, #1f0a2e 0%, #12071f 42%, #050210 75%, #000000 100%),
            radial-gradient(ellipse at 85% 92%, rgba(30,22,95,0.45) 0%, transparent 55%),
            radial-gradient(ellipse at 8% 88%, rgba(74,20,70,0.4) 0%, transparent 55%)
          `,
        }}
      />

      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 z-10 p-3.5 px-5 rounded-xl border border-[#d688d6]/30 bg-gradient-to-r from-[#1e0e2a]/80 to-[#060a12]/90 backdrop-blur-md shrink-0 shadow-[0_10px_30px_rgba(0,0,0,0.5)] w-full">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#ffc3ea]/15 border border-[#ffc3ea]/30 text-[#ffc3ea]">
            <Compass className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-['Orbitron',sans-serif] font-bold text-[#d9f8ff] tracking-wider flex items-center gap-3">
              Echo-26 3D Campus Inspector
              <span className="text-xs font-mono uppercase bg-[#4a1f52]/50 text-[#ffc3ea] border border-[#d688d6]/50 px-2.5 py-0.5 rounded-full flex items-center gap-1.5 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                PORT 5500 LIVE
              </span>
            </h1>
            <p className="text-sm text-[#5c8a93] font-mono">
              Interactive 3D Three.js Campus Inspector & Navigation Routing Engine
            </p>
          </div>
        </div>

        {/* Quick Action Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#091a20]/60 hover:bg-[#12081d] text-[#ffc3ea] border border-[#4a1f52]/60 text-xs font-['Orbitron',sans-serif] font-bold transition-all shadow-md active:scale-95 cursor-pointer"
            title="Reload 3D Campus Engine"
          >
            <RefreshCw className="w-4 h-4" /> Reload Engine
          </button>
          <button
            onClick={handleOpenExternal}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-[#4a1f52] to-[#d688d6] text-[#d9f8ff] font-['Orbitron',sans-serif] font-bold text-xs hover:border-[#ffc3ea] transition-all shadow-[0_0_18px_rgba(255,195,234,0.3)] active:scale-95 cursor-pointer"
            title="Open in Browser Window"
          >
            <ExternalLink className="w-4 h-4" /> Open Full Screen
          </button>
        </div>
      </div>

      {/* Main Viewport Container — Utilizes 100% Full Viewport */}
      <div className="relative flex-1 w-full rounded-xl border border-[#d688d6]/30 overflow-hidden bg-black shadow-2xl z-10 flex flex-col min-h-0">
        {isLoading && (
          <div className="absolute inset-0 bg-[#05020c]/90 backdrop-blur-md flex flex-col items-center justify-center space-y-3 z-20 pointer-events-none">
            <div className="w-12 h-12 rounded-full border-2 border-[#d688d6]/30 border-t-[#ffc3ea] animate-spin" />
            <span className="text-sm font-['Orbitron',sans-serif] font-bold text-[#ffc3ea] animate-pulse">
              INITIALIZING ECHO-26 3D THREE.JS ENGINE...
            </span>
          </div>
        )}

        <iframe
          key={iframeKey}
          src={serverUrl}
          title="Echo-26 3D Campus Inspector"
          onLoad={() => setIsLoading(false)}
          className="w-full h-full border-0 bg-black flex-1"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        />
      </div>
    </div>
  );
}
