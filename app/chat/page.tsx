"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ChatMessage } from "@/components/chat/chat-message";
import { ChatInput } from "@/components/chat/chat-input";
import { Message } from "@/types";
import { BookOpen, CheckSquare, Globe, Cpu, RefreshCw, Sparkles } from "lucide-react";
import { askQuestion } from "@/lib/api";

const INITIAL_MESSAGES: Message[] = [
  {
    id: "welcome-1",
    role: "assistant",
    content:
      "Good day, Sriram. FRIDAY Real Production System is online. How may I assist you today?",
    timestamp: "Now",
    modelUsed: "llama-3.1-8b-instant",
  },
];

const SUGGESTIONS = [
  {
    title: "Academic Timetable",
    desc: "llama-3.1-8b-instant",
    icon: BookOpen,
    prompt: "What is my timetable for tomorrow?",
  },
  {
    title: "Internships & Career",
    desc: "llama-3.1-8b-instant",
    icon: CheckSquare,
    prompt: "Find active software engineering internships for final year students.",
  },
  {
    title: "Draft Formal Email",
    desc: "llama-3.1-70b-versatile",
    icon: Globe,
    prompt: "Write an email to my professor requesting permission for a 2-day leave.",
  },
  {
    title: "Schedule Reminder",
    desc: "mixtral-8x7b",
    icon: Cpu,
    prompt: "Remind me tomorrow at 9 AM to submit my assignment.",
  },
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

  const handleSendMessage = useCallback((text: string) => {
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: now,
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsThinking(true);

    const assistantId = `assistant-${Date.now()}`;

    // Send query directly to live FastAPI endpoint http://127.0.0.1:8000/ask
    askQuestion(text)
      .then((res) => {
        const assistantMsg: Message = {
          id: assistantId,
          role: "assistant",
          content: res.answer,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          modelUsed: res.model_used,
          agentUsed: res.agent_used,
        };
        setMessages((prev) => [...prev, assistantMsg]);
        setIsThinking(false);
      })
      .catch((err) => {
        const errorMsg: Message = {
          id: assistantId,
          role: "assistant",
          content: `⚠️ API Error: ${err.message || String(err)}`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, errorMsg]);
        setIsThinking(false);
      });
  }, []);

  return (
    <div className="flex flex-col h-full w-full relative overflow-hidden bg-[#05020c] font-['Rajdhani',sans-serif] text-[#d9f8ff]">
      {/* Background Gradients */}
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

      {/* Messages feed — Utilizes 100% full screen width */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-6 relative z-10 w-full">
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}

        {/* Thinking indicator */}
        {isThinking && (
          <div className="flex items-center gap-4 p-5 rounded-2xl bg-gradient-to-r from-[#1e0e2a]/80 to-[#060a12]/80 border border-[#d688d6]/40 w-full animate-pulse shadow-[0_0_20px_rgba(255,195,234,0.15)]">
            <div className="w-10 h-10 rounded-xl bg-[#ffc3ea]/20 flex items-center justify-center text-[#ffc3ea]">
              <RefreshCw className="w-5 h-5 animate-spin" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-['Orbitron',sans-serif] font-bold text-[#ffc3ea] tracking-wider">
                Executing Groq Decision Engine...
              </span>
              <span className="text-xs text-[#5c8a93] font-mono">
                http://127.0.0.1:8000/ask
              </span>
            </div>
          </div>
        )}

        {/* Suggestion cards (utilizes 100% full screen width grid) */}
        {messages.length <= 2 && !isThinking && (
          <div className="pt-6 space-y-4 w-full">
            <div className="flex items-center gap-2 text-sm font-['Orbitron',sans-serif] font-bold text-[#d688d6] uppercase tracking-widest">
              <Sparkles className="w-4 h-4 text-[#ffc3ea]" />
              Groq LLM Engine Suggestions
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
              {SUGGESTIONS.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(item.prompt)}
                    className="flex items-start gap-4 p-5 rounded-xl border border-[#d688d6]/30 bg-gradient-to-b from-[#1e0e2a]/60 to-[#060a12]/70 backdrop-blur-md hover:border-[#ffc3ea] hover:shadow-[0_0_25px_rgba(255,195,234,0.25)] transition-all text-left group cursor-pointer w-full"
                  >
                    <div className="p-3 rounded-xl bg-[#ffc3ea]/15 border border-[#ffc3ea]/30 text-[#ffc3ea] group-hover:bg-[#ffc3ea]/25 transition-colors shrink-0">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-base md:text-lg font-['Orbitron',sans-serif] font-bold text-[#d9f8ff] group-hover:text-[#ffc3ea] transition-colors truncate">
                        {item.title}
                      </span>
                      <span className="text-xs text-[#5c8a93] mt-1 font-mono">{item.desc}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input dock — Full screen width */}
      <div className="p-4 md:p-6 border-t border-[#d688d6]/20 bg-[#05020c]/90 backdrop-blur-xl shrink-0 relative z-20 w-full">
        <ChatInput onSendMessage={handleSendMessage} disabled={isThinking} />
      </div>
    </div>
  );
}
