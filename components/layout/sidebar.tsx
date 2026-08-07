"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  MessageSquare, 
  Camera,
  Compass,
  CheckSquare, 
  Settings, 
  Sparkles, 
  Cpu,
  ChevronLeft,
  ChevronRight,
  Database
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { name: "Chat", href: "/chat", icon: MessageSquare, badge: "AI Core" },
  { name: "Vision", href: "/vision", icon: Camera, badge: "YOLO / AI" },
  { name: "Echo-26", href: "/echo26", icon: Compass, badge: "3D Campus" },
  { name: "Tasks", href: "/tasks", icon: CheckSquare, badge: "Notion" },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "relative flex flex-col h-screen border-r border-[#d688d6]/20 bg-gradient-to-b from-[#12071f]/80 via-[#050210]/90 to-[#000000]/95 backdrop-blur-md transition-all duration-300 z-30 select-none",
        collapsed ? "w-24" : "w-72"
      )}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between h-20 px-5 border-b border-[#d688d6]/20">
        <Link href="/friday" className="flex items-center gap-3 overflow-hidden group" title="Return to FRIDAY 3D Core Hub">
          <div className="relative flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-[#4a1f52] to-[#d688d6] p-0.5 shadow-lg shadow-[#ffc3ea]/20 shrink-0">
            <div className="w-full h-full bg-[#05020c] rounded-[10px] flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-[#ffc3ea] animate-pulse" />
            </div>
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-['Orbitron',sans-serif] font-bold text-lg tracking-widest text-[#d9f8ff] group-hover:text-[#ffc3ea] transition-colors">
                FRIDAY
              </span>
              <span className="text-[10px] text-[#5c8a93] font-mono -mt-0.5 tracking-widest uppercase">
                CORE HUB ➔
              </span>
            </div>
          )}
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-lg text-[#5c8a93] hover:text-[#d9f8ff] hover:bg-[#d688d6]/10 transition-colors"
          title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          id="sidebar-toggle-btn"
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-5 space-y-2 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== "/chat" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-4 px-4 py-4 rounded-xl font-medium text-base transition-all duration-200 group relative",
                isActive
                  ? "bg-gradient-to-r from-[#4a1f52]/60 to-[#d688d6]/20 text-[#ffc3ea] border border-[#d688d6]/40 shadow-[0_0_18px_rgba(255,195,234,0.2)]"
                  : "text-[#5c8a93] hover:text-[#d9f8ff] hover:bg-[#d688d6]/10"
              )}
            >
              <Icon
                className={cn(
                  "w-6 h-6 shrink-0 transition-colors",
                  isActive ? "text-[#ffc3ea]" : "text-[#5c8a93] group-hover:text-[#d9f8ff]"
                )}
              />
              {!collapsed && (
                <span className="truncate flex-1 font-['Rajdhani',sans-serif] tracking-wider text-base font-semibold">{item.name}</span>
              )}
              {!collapsed && item.badge && (
                <span
                  className={cn(
                    "text-[10px] font-mono px-2 py-0.5 rounded-full border tracking-widest uppercase",
                    isActive
                      ? "bg-[#ffc3ea]/20 text-[#ffc3ea] border-[#ffc3ea]/40"
                      : "bg-[#091a20]/60 text-[#5c8a93] border-[#4a1f52]/40"
                  )}
                >
                  {item.badge}
                </span>
              )}
              {collapsed && (
                <div className="absolute left-full ml-2 px-2.5 py-1 bg-[#12081d] border border-[#d688d6]/30 text-xs text-[#d9f8ff] rounded-md shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">
                  {item.name}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* System Status Footprint */}
      {!collapsed && (
        <div className="mx-3 my-3 p-3 rounded-xl bg-[#091a20]/40 border border-[#4a1f52]/40 space-y-2 text-xs">
          <div className="flex items-center justify-between text-[#5c8a93]">
            <span className="flex items-center gap-1.5 font-mono text-[11px]">
              <Cpu className="w-3.5 h-3.5 text-[#d688d6]" /> System
            </span>
            <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
              ONLINE
            </span>
          </div>
          <div className="flex items-center justify-between text-[#5c8a93]">
            <span className="flex items-center gap-1.5 font-mono text-[11px]">
              <Database className="w-3.5 h-3.5 text-[#ffc3ea]" /> Vault Vector
            </span>
            <span className="text-[10px] text-[#d9f8ff] font-mono">142 Docs</span>
          </div>
        </div>
      )}

      {/* Profile & Status Footer */}
      <div className="p-4 border-t border-[#d688d6]/20 flex items-center gap-3">
        <div className="relative">
          <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-[#4a1f52] to-[#d688d6] flex items-center justify-center text-[#d9f8ff] font-['Orbitron',sans-serif] font-bold text-sm shadow-md shrink-0 border border-[#ffc3ea]/40">
            SR
          </div>
          <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-[#05020c]" />
        </div>
        {!collapsed && (
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-sm font-bold text-[#d9f8ff] truncate font-['Orbitron',sans-serif]">Sriram</span>
            <span className="text-xs text-[#5c8a93] truncate flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-[#ffc3ea]" /> Chief Engineer
            </span>
          </div>
        )}
      </div>
    </aside>
  );
}
