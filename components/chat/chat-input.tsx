"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { Send, Paperclip, Globe, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { VoiceMicButton } from "@/components/ui/voice-mic-button";

interface ChatInputProps {
  onSendMessage: (text: string, options?: { searchWeb?: boolean; useObsidian?: boolean }) => void;
  disabled?: boolean;
}

export function ChatInput({ onSendMessage, disabled }: ChatInputProps) {
  const [input, setInput] = useState("");
  const [searchWeb, setSearchWeb] = useState(false);
  const [useObsidian, setUseObsidian] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    if (!input.trim() || disabled) return;
    onSendMessage(input, { searchWeb, useObsidian });
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Voice transcript → append to existing input text
  const handleVoiceTranscript = (text: string) => {
    setInput((prev) => (prev ? `${prev} ${text}` : text));
    textareaRef.current?.focus();
  };

  return (
    <div className="relative w-full mx-auto space-y-3 font-['Rajdhani',sans-serif]">
      {/* Tool Toggles */}
      <div className="flex items-center gap-3 px-2">
        <button
          onClick={() => setUseObsidian(!useObsidian)}
          className={cn(
            "flex items-center gap-2 px-3.5 py-2 rounded-lg border transition-all font-mono text-sm cursor-pointer font-bold",
            useObsidian
              ? "bg-[#4a1f52]/60 border-[#d688d6]/60 text-[#ffc3ea] shadow-[0_0_12px_rgba(255,195,234,0.2)]"
              : "bg-[#091a20]/60 border-[#4a1f52]/40 text-[#5c8a93] hover:text-[#d9f8ff]"
          )}
        >
          <BookOpen className="w-4 h-4" />
          <span>Obsidian RAG {useObsidian ? "ON" : "OFF"}</span>
        </button>

        <button
          onClick={() => setSearchWeb(!searchWeb)}
          className={cn(
            "flex items-center gap-2 px-3.5 py-2 rounded-lg border transition-all font-mono text-sm cursor-pointer font-bold",
            searchWeb
              ? "bg-[#4a1f52]/60 border-[#d688d6]/60 text-[#ffc3ea] shadow-[0_0_12px_rgba(255,195,234,0.2)]"
              : "bg-[#091a20]/60 border-[#4a1f52]/40 text-[#5c8a93] hover:text-[#d9f8ff]"
          )}
        >
          <Globe className="w-4 h-4" />
          <span>Live Search {searchWeb ? "ON" : "OFF"}</span>
        </button>

        <div className="ml-auto text-sm text-[#5c8a93] font-mono hidden sm:block">
          Press <kbd className="bg-[#12081d] px-2 py-0.5 rounded text-[#d688d6] border border-[#d688d6]/30 font-bold">Enter</kbd> to send
        </div>
      </div>

      {/* Input Glass Box */}
      <div className="relative rounded-2xl p-3 bg-gradient-to-b from-[#1e0e2a]/80 to-[#060a12]/90 border border-[#d688d6]/40 backdrop-blur-md focus-within:border-[#ffc3ea] focus-within:shadow-[0_0_30px_rgba(255,195,234,0.3)] transition-all">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask FRIDAY anything — or tap the mic 🎙️ to speak..."
          disabled={disabled}
          rows={3}
          className="w-full bg-transparent border-0 text-lg md:text-xl text-[#d9f8ff] placeholder-[#5c8a93] focus:outline-none resize-none px-3 py-2 min-h-[80px] max-h-[240px] font-medium tracking-wide"
          id="chat-input-textarea"
        />

        {/* Footer Controls */}
        <div className="flex items-center justify-between pt-2 border-t border-[#d688d6]/20 px-2 gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="p-2 rounded-lg text-[#5c8a93] hover:text-[#d9f8ff] hover:bg-[#d688d6]/10 transition-colors cursor-pointer"
              title="Attach File or Context"
            >
              <Paperclip className="w-5 h-5" />
            </button>

            {/* 🎙️ Voice Input Mic Button */}
            <VoiceMicButton onTranscript={handleVoiceTranscript} size="md" />
          </div>

          <button
            onClick={handleSubmit}
            disabled={!input.trim() || disabled}
            className="flex items-center gap-2.5 px-7 py-2.5 rounded-xl bg-gradient-to-r from-[#4a1f52] to-[#d688d6] text-[#d9f8ff] font-['Orbitron',sans-serif] font-bold text-base tracking-wider border border-[#ffc3ea]/50 hover:border-[#ffc3ea] hover:shadow-[0_0_22px_rgba(255,195,234,0.4)] disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
            id="chat-submit-btn"
          >
            <span>Send</span>
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
