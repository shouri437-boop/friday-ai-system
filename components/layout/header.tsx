"use client";

import { usePathname } from "next/navigation";
import { 
  Search, 
  ChevronDown,
  Sparkles,
  Bot
} from "lucide-react";
import { useState } from "react";

const TITLE_MAP: Record<string, { title: string; subtitle: string }> = {
  "/chat": { title: "Neural Stream", subtitle: "AI Chief of Staff Active" },
  "/vision": { title: "Vision Analytics", subtitle: "YOLO Object Detection & Lens Engine" },
  "/echo26": { title: "Echo-26 3D Campus", subtitle: "Interactive Campus Spatial Inspector" },
  "/tasks": { title: "Task Workspace", subtitle: "Notion & Internal Task Engine" },
  "/knowledge": { title: "Knowledge Vault", subtitle: "Obsidian Markdown & RAG Embeddings" },
  "/settings": { title: "System Control", subtitle: "API Keys, Models & Preferences" },
};

const MODELS = [
  { id: "llama-3.1-8b-instant", name: "llama-3.1-8b-instant", badge: "FAST" },
  { id: "llama-3.3-70b-versatile", name: "llama-3.3-70b-versatile", badge: "HEAVY" },
  { id: "mixtral-8x7b-32768", name: "mixtral-8x7b-32768", badge: "BALANCED" },
];

export function Header() {
  const pathname = usePathname();
  const [selectedModel, setSelectedModel] = useState(MODELS[0]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const routeInfo = TITLE_MAP[pathname] || { title: "FRIDAY", subtitle: "Autonomous Agent System" };

  return (
    <header className="h-16 border-b border-[#d688d6]/20 bg-gradient-to-r from-[#12071f]/90 via-[#050210]/95 to-[#000000]/95 backdrop-blur-md px-6 flex items-center justify-between shrink-0 z-20">
      {/* Page Title & Breadcrumb */}
      <div className="flex items-center gap-3">
        <div className="flex flex-col">
          <h1 className="text-base font-['Orbitron',sans-serif] font-bold text-[#d9f8ff] flex items-center gap-2 tracking-wider">
            {routeInfo.title}
          </h1>
          <p className="text-xs text-[#5c8a93] font-mono flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ffc3ea] animate-pulse" />
            {routeInfo.subtitle}
          </p>
        </div>
      </div>

      {/* Action Controls & Model Switcher */}
      <div className="flex items-center gap-3">
        {/* Quick Command / Search Bar Trigger */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#091a20]/60 border border-[#4a1f52]/60 text-xs text-[#5c8a93]">
          <Search className="w-3.5 h-3.5 text-[#ffc3ea]" />
          <span>Search docs or actions...</span>
          <kbd className="font-mono text-[10px] bg-[#12081d] px-1.5 py-0.5 rounded text-[#d688d6] border border-[#d688d6]/20">
            ⌘K
          </kbd>
        </div>

        {/* Model Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#4a1f52]/40 to-[#d688d6]/20 border border-[#d688d6]/30 text-xs text-[#d9f8ff] hover:border-[#ffc3ea] transition-all cursor-pointer"
          >
            <Bot className="w-4 h-4 text-[#ffc3ea]" />
            <span className="font-mono font-medium">{selectedModel.name}</span>
            <ChevronDown className="w-3.5 h-3.5 text-[#5c8a93]" />
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl bg-[#12081d] border border-[#d688d6]/40 shadow-2xl p-1.5 z-50 backdrop-blur-xl">
              {MODELS.map((model) => (
                <button
                  key={model.id}
                  onClick={() => {
                    setSelectedModel(model);
                    setIsDropdownOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between text-[#5c8a93] hover:text-[#d9f8ff] hover:bg-[#4a1f52]/40 transition-colors"
                >
                  <span className="font-mono">{model.name}</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#ffc3ea]/10 text-[#ffc3ea] border border-[#ffc3ea]/30">
                    {model.badge}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* System Online Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-xs text-emerald-400 font-mono">
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">SYS. <b>ONLINE</b></span>
        </div>
      </div>
    </header>
  );
}
