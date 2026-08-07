"use client";

import { cn } from "@/lib/utils";
import { useVoiceInput } from "@/hooks/use-voice-input";
import { Mic, MicOff } from "lucide-react";

interface VoiceMicButtonProps {
  onTranscript: (text: string) => void;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function VoiceMicButton({ onTranscript, className, size = "md" }: VoiceMicButtonProps) {
  const { isListening, toggleListening } = useVoiceInput({
    onTranscript,
    onError: (msg) => console.warn("[VoiceMic]", msg),
  });

  const sizeClasses = {
    sm: "p-1.5 w-7 h-7",
    md: "p-2 w-9 h-9",
    lg: "p-2.5 w-11 h-11",
  };

  const iconSizes = {
    sm: "w-3.5 h-3.5",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  return (
    <button
      type="button"
      onClick={toggleListening}
      title={isListening ? "Stop listening" : "Speak your message"}
      className={cn(
        "rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer shrink-0 border",
        isListening
          ? "bg-[#ffc3ea]/25 border-[#ffc3ea] text-[#ffc3ea] shadow-[0_0_18px_rgba(255,195,234,0.5)] animate-pulse"
          : "bg-[#091a20]/60 border-[#4a1f52]/60 text-[#5c8a93] hover:border-[#d688d6] hover:text-[#ffc3ea] hover:shadow-[0_0_12px_rgba(255,195,234,0.25)]",
        sizeClasses[size],
        className
      )}
    >
      {isListening ? (
        <MicOff className={iconSizes[size]} />
      ) : (
        <Mic className={iconSizes[size]} />
      )}
    </button>
  );
}
