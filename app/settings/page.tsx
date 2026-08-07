"use client";

import { useState } from "react";
import { 
  Settings, 
  Key, 
  Sparkles, 
  BookOpen, 
  Save, 
  Check
} from "lucide-react";

export default function SettingsPage() {
  const [saved, setSaved] = useState(false);
  const [formData, setFormData] = useState({
    openaiApiKey: "sk-proj-••••••••••••••••••••••••••••",
    notionToken: "secret_••••••••••••••••••••••••••••",
    notionDatabaseId: "8921a92e102f4a1bb872c0192e",
    obsidianVaultPath: "/Users/Continuum/Obsidian/BrainVault",
    tavilyApiKey: "tvly-••••••••••••••••••••",
    persona: "FRIDAY",
    model: "gpt-4o",
    temperature: 0.7,
    autoSyncRAG: true,
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="flex flex-col h-full p-6 md:p-8 overflow-y-auto bg-[#05020c] font-['Rajdhani',sans-serif] text-[#d9f8ff] space-y-6 max-w-5xl mx-auto w-full">
      {/* Header Banner */}
      <div className="flex items-center justify-between p-6 rounded-2xl border border-[#d688d6]/30 bg-gradient-to-r from-[#1e0e2a]/70 to-[#060a12]/80 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-[#ffc3ea]/15 border border-[#ffc3ea]/30 text-[#ffc3ea]">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-['Orbitron',sans-serif] font-bold text-[#d9f8ff] tracking-wider">
              System Settings & Integration Credentials
            </h2>
            <p className="text-xs text-[#5c8a93] font-mono">
              Configure Groq API endpoints, Notion Workspace, and Notion Calendar secrets.
            </p>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#4a1f52] to-[#d688d6] text-[#d9f8ff] font-['Orbitron',sans-serif] font-bold text-xs hover:border-[#ffc3ea] transition-all shadow-[0_0_15px_rgba(255,195,234,0.2)] cursor-pointer"
          id="save-settings-btn"
        >
          {saved ? <Check className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
          <span>{saved ? "Saved Configuration" : "Save Changes"}</span>
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: API Keys & Credentials */}
        <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4">
          <div className="flex items-center gap-2 border-b border-white/10 pb-3 text-sm font-semibold text-slate-200">
            <Key className="w-4 h-4 text-cyan-400" />
            API Keys & External Tool Integrations
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-medium">
                OpenAI API Key
              </label>
              <input
                type="password"
                value={formData.openaiApiKey}
                onChange={(e) => setFormData({ ...formData, openaiApiKey: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-medium">
                Notion Integration Secret
              </label>
              <input
                type="password"
                value={formData.notionToken}
                onChange={(e) => setFormData({ ...formData, notionToken: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-medium">
                Notion Database ID
              </label>
              <input
                type="text"
                value={formData.notionDatabaseId}
                onChange={(e) => setFormData({ ...formData, notionDatabaseId: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-medium">
                Tavily Search API Key
              </label>
              <input
                type="password"
                value={formData.tavilyApiKey}
                onChange={(e) => setFormData({ ...formData, tavilyApiKey: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Obsidian RAG Settings */}
        <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4">
          <div className="flex items-center gap-2 border-b border-white/10 pb-3 text-sm font-semibold text-slate-200">
            <BookOpen className="w-4 h-4 text-indigo-400" />
            Obsidian Vault RAG & Vector Engine
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-medium">
                Obsidian Vault Folder Path
              </label>
              <input
                type="text"
                value={formData.obsidianVaultPath}
                onChange={(e) => setFormData({ ...formData, obsidianVaultPath: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-white/5">
              <div>
                <span className="text-xs font-semibold text-slate-200">Automatic File Watcher Sync</span>
                <p className="text-[11px] text-slate-400">Re-index vector embeddings immediately when markdown files change.</p>
              </div>
              <input
                type="checkbox"
                checked={formData.autoSyncRAG}
                onChange={(e) => setFormData({ ...formData, autoSyncRAG: e.target.checked })}
                className="w-4 h-4 accent-cyan-500 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Section 3: AI Persona & Model Parameters */}
        <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4">
          <div className="flex items-center gap-2 border-b border-white/10 pb-3 text-sm font-semibold text-slate-200">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            Agent Persona & Reasoning Parameters
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-medium">
                Assistant Persona Preset
              </label>
              <select
                value={formData.persona}
                onChange={(e) => setFormData({ ...formData, persona: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-slate-100 focus:outline-none"
              >
                <option value="FRIDAY">FRIDAY (Polite, Technical, Crisp)</option>
                <option value="JARVIS">JARVIS (Witty, Formal, Direct)</option>
                <option value="Minimalist">Minimalist (Terse Code & Bullet Points)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-300 font-medium">
                Temperature ({formData.temperature})
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={formData.temperature}
                onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                className="w-full accent-cyan-400 cursor-pointer mt-2"
              />
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
