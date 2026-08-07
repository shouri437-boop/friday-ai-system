"use client";

import { Message } from "@/types";
import { Sparkles, User, Copy, Check, Bot, Volume2, VolumeX, Mic } from "lucide-react";
import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { configureSoftFeminineUtterance } from "@/lib/voice";

interface ChatMessageProps {
  message: Message;
}

function renderAgentBadge(agentUsed?: string) {
  if (!agentUsed) return null;
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#4a1f52]/60 text-[#ffc3ea] border border-[#d688d6]/50 shadow-sm">
      <Bot className="w-3.5 h-3.5 text-[#ffc3ea]" />
      {agentUsed.toLowerCase()}
    </span>
  );
}

export function ChatMessage({ message }: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [selectedAccent, setSelectedAccent] = useState<string>("soft-uk");
  const isAssistant = message.role === "assistant";

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Speak button handler — Speaks using tuned Soft & Feminine voice with selected accent
  const handleSpeak = useCallback((accent: string = selectedAccent) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const doSpeak = () => {
      setIsSpeaking(true);
      const utterance = new SpeechSynthesisUtterance(message.content);
      configureSoftFeminineUtterance(utterance, accent);

      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    };

    // Voices may not be loaded yet — wait for them if needed
    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.onvoiceschanged = null;
        doSpeak();
      };
    } else {
      doSpeak();
    }
  }, [message.content, isSpeaking, selectedAccent]);

  return (
    <div
      className={cn(
        "flex gap-4 p-5 md:p-7 rounded-2xl transition-all duration-200 group relative border backdrop-blur-md w-full",
        isAssistant
          ? "bg-gradient-to-r from-[#1e0e2a]/80 to-[#060a12]/90 border-[#d688d6]/35 shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
          : "bg-gradient-to-r from-[#4a1f52]/50 to-[#12071f]/60 border-[#ffc3ea]/40"
      )}
    >
      {/* Avatar */}
      <div className="shrink-0">
        {isAssistant ? (
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#4a1f52] to-[#d688d6] p-0.5 shadow-md shadow-[#ffc3ea]/20">
            <div className="w-full h-full bg-[#05020c] rounded-[10px] flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-[#ffc3ea]" />
            </div>
          </div>
        ) : (
          <div className="w-12 h-12 rounded-xl bg-[#12081d] border border-[#d688d6]/40 flex items-center justify-center text-[#d9f8ff]">
            <User className="w-6 h-6" />
          </div>
        )}
      </div>

      {/* Content Body */}
      <div className="flex-1 min-w-0 space-y-3 font-['Rajdhani',sans-serif]">
        {/* Author Header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-['Orbitron',sans-serif] font-bold text-lg md:text-xl text-[#d9f8ff]">
              {isAssistant ? "FRIDAY AI" : "You"}
            </span>
            <span className="text-sm text-[#5c8a93] font-mono font-medium">
              {message.timestamp}
            </span>
            {isAssistant && renderAgentBadge(message.agentUsed)}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
            {/* 🔊 Voice Accent Selector & Speak Button */}
            {isAssistant && (
              <div className="flex items-center gap-1">
                <select
                  value={selectedAccent}
                  onChange={(e) => {
                    setSelectedAccent(e.target.value);
                    if (isSpeaking) {
                      window.speechSynthesis.cancel();
                      setIsSpeaking(false);
                    }
                  }}
                  className="bg-[#1e0e2a] border border-[#d688d6]/40 text-[#ffc3ea] text-[11px] font-mono rounded-lg px-2 py-1 focus:outline-none focus:border-[#ffc3ea] cursor-pointer"
                  title="Select Soft Voice Accent"
                >
                  <option value="soft-uk">🇬🇧 Soft British Female</option>
                  <option value="soft-us">🇺🇸 Soft American Female</option>
                  <option value="soft-int">🌐 Soft Natural Female</option>
                </select>

                <button
                  onClick={() => handleSpeak(selectedAccent)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 cursor-pointer font-mono font-bold transition-all",
                    isSpeaking
                      ? "bg-[#ffc3ea]/20 border border-[#ffc3ea]/60 text-[#ffc3ea] shadow-[0_0_14px_rgba(255,195,234,0.4)] animate-pulse"
                      : "bg-[#4a1f52]/40 border border-[#d688d6]/30 text-[#d688d6] hover:border-[#ffc3ea] hover:text-[#ffc3ea] hover:shadow-[0_0_12px_rgba(255,195,234,0.3)]"
                  )}
                  title={isSpeaking ? "Stop Speaking" : "Speak response in soft feminine voice"}
                >
                  {isSpeaking ? (
                    <>
                      <VolumeX className="w-4 h-4" />
                      <span>Stop</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-4 h-4 text-[#ffc3ea]" />
                      <span>Speak</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Copy Button */}
            <button
              onClick={handleCopy}
              className="px-2.5 py-1.5 rounded-lg text-[#5c8a93] hover:text-[#d9f8ff] hover:bg-[#d688d6]/10 transition-all text-xs flex items-center gap-1.5 cursor-pointer font-mono"
              title="Copy message"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400 font-bold">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Message Content Text */}
        <div className="text-lg md:text-xl leading-relaxed text-[#d9f8ff] whitespace-pre-wrap tracking-wide font-medium">
          {message.content}
        </div>
      </div>
    </div>
  );
}
