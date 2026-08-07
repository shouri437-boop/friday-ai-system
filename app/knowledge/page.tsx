"use client";

import { useState } from "react";
import { KnowledgeDoc } from "@/types";
import { 
  BookOpen, 
  Search, 
  RefreshCw, 
  FileText, 
  Folder, 
  Database,
  Tag
} from "lucide-react";

const INITIAL_DOCS: KnowledgeDoc[] = [
  {
    id: "doc-1",
    title: "FRIDAY Agentic Architecture Overview.md",
    path: "Projects/FRIDAY/Architecture.md",
    excerpt: "The FRIDAY system combines Next.js frontend, FastAPI Python microservice, LangGraph orchestrator, and PostgreSQL + pgvector...",
    tags: ["Architecture", "LangGraph", "Python"],
    lastSynced: "10 mins ago",
    wordCount: 1420,
    score: 0.94,
  },
  {
    id: "doc-2",
    title: "LlamaIndex RAG Pipeline Setup.md",
    path: "Engineering/AI/RAG-LlamaIndex.md",
    excerpt: "Chunking strategies for local Obsidian markdown notes: SentenceSplitter(chunk_size=512, chunk_overlap=64)...",
    tags: ["RAG", "LlamaIndex", "Embeddings"],
    lastSynced: "1 hour ago",
    wordCount: 890,
    score: 0.89,
  },
  {
    id: "doc-3",
    title: "FastAPI Async Worker Queue Design.md",
    path: "Engineering/Backend/FastAPI-Workers.md",
    excerpt: "Background task routing using Celery/Redis vs asyncio worker pool for non-blocking tool executions...",
    tags: ["Backend", "FastAPI", "Async"],
    lastSynced: "3 hours ago",
    wordCount: 650,
    score: 0.82,
  },
  {
    id: "doc-4",
    title: "Notion & Gmail External Tool Specs.md",
    path: "Projects/FRIDAY/Tools-Spec.md",
    excerpt: "OAuth2 authentication and API schema for Notion task database queries and Gmail draft creation...",
    tags: ["Tools", "Notion", "APIs"],
    lastSynced: "Yesterday",
    wordCount: 1100,
    score: 0.78,
  },
];

export default function KnowledgePage() {
  const [docs] = useState<KnowledgeDoc[]>(INITIAL_DOCS);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);

  const filteredDocs = docs.filter(
    (doc) =>
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleSyncVault = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
    }, 1500);
  };

  return (
    <div className="flex flex-col h-full p-6 md:p-8 space-y-6 overflow-y-auto bg-[#05020c] font-['Rajdhani',sans-serif] text-[#d9f8ff]">
      {/* RAG Status Hero Banner */}
      <div className="p-6 rounded-2xl border border-[#d688d6]/30 bg-gradient-to-r from-[#1e0e2a]/70 to-[#060a12]/80 backdrop-blur-md relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-4 z-10">
          <div className="p-3 rounded-2xl bg-[#ffc3ea]/15 border border-[#ffc3ea]/30 text-[#ffc3ea]">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-['Orbitron',sans-serif] font-bold text-[#d9f8ff] flex items-center gap-2 tracking-wider">
              Obsidian Vault Knowledge Engine
              <span className="text-xs font-mono font-normal px-2.5 py-0.5 rounded-full bg-[#4a1f52]/40 text-[#ffc3ea] border border-[#d688d6]/40">
                Obsidian RAG
              </span>
            </h2>
            <p className="text-xs text-[#5c8a93] mt-1 font-mono">
              Dataset Path: <code className="text-[#d9f8ff] font-mono">ragflow/data</code> • 142 Documents Synced
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 z-10">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-mono text-emerald-400 flex items-center gap-1 justify-end">
              <Database className="w-3.5 h-3.5" /> Vector DB Ready
            </div>
            <div className="text-[11px] text-[#5c8a93] font-mono">
              Schema: text-embedding-3-small (1536d)
            </div>
          </div>

          <button
            onClick={handleSyncVault}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#4a1f52] to-[#d688d6] text-[#d9f8ff] font-['Orbitron',sans-serif] font-bold text-xs hover:border-[#ffc3ea] transition-all shadow-[0_0_15px_rgba(255,195,234,0.2)] cursor-pointer"
            id="sync-vault-btn"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
            <span>{isSyncing ? "Indexing Vault..." : "Re-sync Vault"}</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#5c8a93] absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Semantic RAG search across Obsidian note chunks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#091a20]/60 border border-[#4a1f52]/60 text-sm text-[#d9f8ff] placeholder-[#5c8a93] focus:outline-none focus:border-[#ffc3ea]"
            id="knowledge-search-input"
          />
        </div>
      </div>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredDocs.map((doc) => (
          <div
            key={doc.id}
            className="p-5 rounded-2xl border border-[#d688d6]/25 bg-gradient-to-b from-[#1e0e2a]/60 to-[#060a12]/70 backdrop-blur-md hover:border-[#ffc3ea] hover:shadow-[0_0_20px_rgba(255,195,234,0.2)] transition-all space-y-3 flex flex-col justify-between group"
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                  <h3 className="text-sm font-semibold text-slate-200 group-hover:text-cyan-300 transition-colors">
                    {doc.title}
                  </h3>
                </div>
                {doc.score && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    Match: {Math.round(doc.score * 100)}%
                  </span>
                )}
              </div>

              <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
                <Folder className="w-3 h-3 text-indigo-400" />
                {doc.path}
              </div>

              <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                {doc.excerpt}
              </p>
            </div>

            {/* Tags & Metadata Footer */}
            <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 flex-wrap">
                {doc.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-white/5 flex items-center gap-1"
                  >
                    <Tag className="w-2.5 h-2.5 text-cyan-400" />
                    {tag}
                  </span>
                ))}
              </div>

              <span className="text-[10px] text-slate-500 font-mono">
                {doc.wordCount} words • Synced {doc.lastSynced}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
