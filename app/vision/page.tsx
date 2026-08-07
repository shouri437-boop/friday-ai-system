"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { 
  Camera, 
  Video, 
  VideoOff, 
  ShieldAlert, 
  RefreshCw, 
  Sparkles, 
  Tag, 
  Target, 
  FileText, 
  RotateCcw, 
  Copy, 
  Check, 
  Terminal, 
  Eye, 
  MessageSquare, 
  Send, 
  Bot, 
  User,
  Maximize2,
  Edit3
} from "lucide-react";
import { 
  scanVisionObject, 
  askVisionFollowUp, 
  ScanAnalysisResponse 
} from "@/lib/api";
import { VoiceMicButton } from "@/components/ui/voice-mic-button";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  modelUsed?: string;
}

export default function VisionPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [copiedText, setCopiedText] = useState<boolean>(false);
  const [manualTitle, setManualTitle] = useState<string>("");

  // Deep Scan Analysis Result
  const [scanResult, setScanResult] = useState<ScanAnalysisResponse | null>(null);
  const [frozenFrame, setFrozenFrame] = useState<string | null>(null);

  // Vision Chatbot State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState<string>("");
  const [isThinking, setIsThinking] = useState<boolean>(false);

  // 1. Start Webcam Feed
  const startCamera = useCallback(async () => {
    setErrorMsg(null);
    setScanResult(null);
    setFrozenFrame(null);
    setChatMessages([]);
    try {
      const apiKey = process.env.MY_API_KEY || process.env.NEXT_PUBLIC_MY_API_KEY;
      if (!apiKey) {
        throw new Error("API key not found");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1920 }, height: { ideal: 1080 }, facingMode: "user" },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setIsStreaming(true);
        };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("API key not found")) {
        setErrorMsg("API key not found");
      } else {
        setErrorMsg(`Camera error: ${msg}`);
      }
      setIsStreaming(false);
    }
  }, []);

  // 2. Stop Webcam Feed
  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
  }, []);

  // Initialize camera on mount
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  // Scroll Chatbot to bottom on new message
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isThinking]);

  // 3. 📸 Scan & Analyze Button Handler
  const handleScanAndAnalyze = async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      setIsScanning(true);
      setErrorMsg(null);

      let captureCanvas = captureCanvasRef.current;
      if (!captureCanvas) {
        captureCanvas = document.createElement("canvas");
        captureCanvasRef.current = captureCanvas;
      }

      const w = video.videoWidth || 1920;
      const h = video.videoHeight || 1080;
      captureCanvas.width = w;
      captureCanvas.height = h;

      const ctx = captureCanvas.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, w, h);
      const dataUrl = captureCanvas.toDataURL("image/jpeg", 0.92);
      setFrozenFrame(dataUrl);

      // Call Backend Vision Scan API with multi-pass OCR & optional title hint
      const result = await scanVisionObject(dataUrl, manualTitle);
      setScanResult(result);

      // Initialize Vision Chatbot with detailed analysis so user can ask follow-ups immediately
      const topicsLine = result.key_topics?.length
        ? `\n\nKey topics: ${result.key_topics.join(", ")}`
        : "";
      const welcomeMsg: ChatMessage = {
        id: `welcome-${Date.now()}`,
        role: "assistant",
        content: [
          `I've analyzed **${result.title}** (${result.category}).`,
          "",
          result.summary,
          topicsLine,
          result.useful_for ? `\n\nBest for: ${result.useful_for}` : "",
          "",
          "Ask me anything about this item — characters, plot, chapters, concepts, or recommendations!",
        ].join(""),
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        modelUsed: "qwen/qwen3.6-27b",
      };
      setChatMessages([welcomeMsg]);

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(`Scan Analysis Error: ${msg}`);
    } finally {
      setIsScanning(false);
    }
  };

  const handleResetScan = () => {
    setScanResult(null);
    setFrozenFrame(null);
    setChatMessages([]);
    setCopiedText(false);
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  // 4. Vision Chatbot Follow-up Handler
  const handleSendChatMessage = async (textToSend?: string) => {
    const query = (textToSend || chatInput).trim();
    if (!query || isThinking || !scanResult) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setIsThinking(true);

    try {
      const richContext = [
        scanResult.full_text_output || scanResult.summary,
        scanResult.category ? `Category: ${scanResult.category}` : "",
        scanResult.key_topics?.length ? `Key topics: ${scanResult.key_topics.join(", ")}` : "",
        scanResult.useful_for ? `Useful for: ${scanResult.useful_for}` : "",
        scanResult.prerequisites ? `Prerequisites: ${scanResult.prerequisites}` : "",
      ].filter(Boolean).join("\n\n");

      const res = await askVisionFollowUp(
        query,
        scanResult.title,
        richContext
      );

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: "assistant",
        content: res.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        modelUsed: res.model_used,
      };

      setChatMessages((prev) => [...prev, botMsg]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const errorBotMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: `⚠️ Chatbot Error: ${msg}`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setChatMessages((prev) => [...prev, errorBotMsg]);
    } finally {
      setIsThinking(false);
    }
  };

  const getPromptSuggestions = (category: string, title: string) => {
    const cat = category.toLowerCase();
    if (cat.includes("manga") || cat.includes("anime") || title.toLowerCase().includes("bleach")) {
      return [
        "Who are the main characters and their roles?",
        "Summarize the main story arc",
        "What makes this series popular?",
      ];
    }
    if (cat.includes("engineering") || cat.includes("textbook") || cat.includes("education")) {
      return [
        "Summarize the key chapters & concepts",
        "What are the prerequisites for this book?",
        "Give me 5 practice interview questions on this topic",
      ];
    }
    return [
      "Tell me more about this item",
      "What should I know before getting into this?",
      "Give me 3 interesting facts about it",
    ];
  };

  const promptSuggestions = scanResult
    ? getPromptSuggestions(scanResult.category, scanResult.title)
    : [];

  return (
    <div className="flex flex-col h-full relative overflow-y-auto bg-[#05020c] p-4 md:p-6 space-y-6 font-['Rajdhani',sans-serif] text-[#d9f8ff]">
      {/* Background ambient lighting */}
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

      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 z-10 p-4 rounded-2xl border border-[#d688d6]/30 bg-gradient-to-r from-[#1e0e2a]/70 to-[#060a12]/80 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#ffc3ea]/15 border border-[#ffc3ea]/30 text-[#ffc3ea]">
            <Eye className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-['Orbitron',sans-serif] font-bold text-[#d9f8ff] tracking-wider flex items-center gap-2">
              FRIDAY Visual Lens & AI Chatbot
              <span className="text-[10px] font-mono uppercase bg-[#4a1f52]/40 text-[#ffc3ea] border border-[#d688d6]/40 px-2 py-0.5 rounded-full">
                Expanded Viewport & Multi-Pass OCR
              </span>
            </h1>
            <p className="text-xs text-[#5c8a93] font-mono">
              Hold up any book or object to your camera & click &quot;Scan & Analyze Object&quot;
            </p>
          </div>
        </div>

        {/* Action Controls & Optional Title Hint Input */}
        <div className="flex flex-wrap items-center gap-3">
          {isStreaming && !scanResult && (
            <div className="relative flex items-center gap-2">
              <input
                type="text"
                value={manualTitle}
                onChange={(e) => setManualTitle(e.target.value)}
                placeholder="Optional title hint (e.g. Digital Communication Systems)..."
                className="w-56 md:w-72 px-3.5 py-2 rounded-xl bg-[#091a20]/60 border border-[#4a1f52]/60 text-[#d9f8ff] placeholder-[#5c8a93] text-xs focus:outline-none focus:border-[#ffc3ea] transition-colors"
              />
              <VoiceMicButton
                onTranscript={(t) => setManualTitle(t)}
                size="sm"
              />
            </div>
          )}

          {isStreaming && !scanResult && (
            <button
              onClick={handleScanAndAnalyze}
              disabled={isScanning}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#4a1f52] to-[#d688d6] text-[#d9f8ff] font-['Orbitron',sans-serif] font-bold text-xs hover:border-[#ffc3ea] transition-all shadow-[0_0_18px_rgba(255,195,234,0.3)] active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isScanning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Analyzing Object...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-[#ffc3ea] animate-pulse" />
                  📸 Scan & Analyze Object
                </>
              )}
            </button>
          )}

          {scanResult && (
            <button
              onClick={handleResetScan}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#4a1f52]/40 hover:bg-[#4a1f52]/60 text-[#ffc3ea] border border-[#d688d6]/40 font-['Orbitron',sans-serif] font-bold text-xs transition-all shadow-lg cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" /> Scan Another Item
            </button>
          )}

          {isStreaming ? (
            <button
              onClick={stopCamera}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-['Orbitron',sans-serif] font-bold text-xs transition-all shadow-lg cursor-pointer"
            >
              <VideoOff className="w-4 h-4" /> Stop Camera
            </button>
          ) : (
            <button
              onClick={startCamera}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#4a1f52] to-[#d688d6] text-[#d9f8ff] font-['Orbitron',sans-serif] font-bold text-xs hover:border-[#ffc3ea] transition-all shadow-[0_0_15px_rgba(255,195,234,0.2)] cursor-pointer"
            >
              <Video className="w-4 h-4" /> Start Camera
            </button>
          )}
        </div>
      </div>

      {/* API Key / Error Alert */}
      {errorMsg && (
        <div className="z-20 flex items-center gap-3 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/40 text-rose-300 text-sm shadow-xl">
          <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
          <div className="flex-1">
            <strong className="font-bold">Error:</strong> {errorMsg}
          </div>
          <button
            onClick={startCamera}
            className="px-3 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-xs font-medium"
          >
            Retry
          </button>
        </div>
      )}

      {/* 🚀 EXPANDED HIGH-RESOLUTION CAMERA VIEWPORT */}
      <div className="relative rounded-2xl border border-[#d688d6]/30 overflow-hidden flex items-center justify-center bg-black/80 min-h-[500px] md:min-h-[580px] w-full shadow-2xl z-10 group">
        {frozenFrame ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={frozenFrame}
            alt="Captured object frame"
            className="w-full h-[500px] md:h-[580px] object-contain rounded-2xl"
          />
        ) : (
          <video
            ref={videoRef}
            playsInline
            muted
            className="w-full h-[500px] md:h-[580px] object-contain rounded-2xl"
          />
        )}

        {/* Floating Top Control HUD */}
        {isStreaming && !scanResult && (
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-20 pointer-events-none">
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-slate-950/85 border border-cyan-500/40 backdrop-blur-md text-xs font-mono text-cyan-300 shadow-xl pointer-events-auto">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
              CAMERA VIEWPORT ACTIVE (1080P)
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-950/80 px-3 py-1.5 rounded-full border border-white/10 pointer-events-auto">
              <Maximize2 className="w-3.5 h-3.5 text-cyan-400" /> Expanded Area
            </div>
          </div>
        )}

        {isScanning && (
          <div className="absolute inset-0 bg-cyan-950/75 backdrop-blur-md flex flex-col items-center justify-center space-y-4 z-30 p-4 text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-500 p-0.5 animate-spin">
              <div className="w-full h-full bg-[#080b11] rounded-full flex items-center justify-center">
                <Sparkles className="w-10 h-10 text-cyan-400" />
              </div>
            </div>
            <span className="text-sm font-bold text-cyan-300 font-mono tracking-wider animate-pulse">
              ANALYZING IMAGE WITH GROQ VISION AI...
            </span>
          </div>
        )}

        {!isStreaming && !errorMsg && (
          <div className="flex flex-col items-center justify-center p-8 text-center space-y-3 text-slate-400">
            <div className="w-20 h-20 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shadow-xl">
              <Camera className="w-10 h-10" />
            </div>
            <p className="font-semibold text-slate-200 text-base">Webcam Feed Offline</p>
            <p className="text-xs max-w-sm text-slate-400">
              Click &quot;Start Camera&quot; above to allow video access and begin scanning objects.
            </p>
          </div>
        )}
      </div>

      {/* LOWER SECTION: Identified Analysis Card & Interactive Vision Chatbot */}
      {scanResult && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 z-10 animate-fade-in">
          {/* Left Column: AI Text Output Window & Identified Item Card */}
          <div className="flex flex-col rounded-2xl glass-panel border border-white/10 p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-400" />
                  Identified Item & OCR
                </span>
                <h3 className="text-lg font-bold text-gradient mt-1 leading-snug">
                  {scanResult.title}
                </h3>
              </div>
              <span className="text-xs font-mono px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
                {scanResult.category}
              </span>
            </div>

            {/* 📑 Dedicated AI Text Output Window */}
            <div className="space-y-2 p-4 rounded-xl bg-slate-950/90 border border-cyan-500/30 shadow-inner">
              <div className="flex items-center justify-between pb-2 border-b border-white/10 text-xs font-mono text-cyan-300">
                <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider">
                  <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                  AI Text Output Window
                </span>
                <button
                  onClick={() => handleCopyText(scanResult.full_text_output || scanResult.summary)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-[10px] transition-all"
                >
                  {copiedText ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" /> Copy Text
                    </>
                  )}
                </button>
              </div>
              <div className="max-h-60 overflow-y-auto pr-1 text-xs font-mono text-slate-200 leading-relaxed whitespace-pre-wrap selection:bg-cyan-500/30 selection:text-cyan-200">
                {scanResult.full_text_output || scanResult.summary}
              </div>
            </div>

            {/* Grid of Key Metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5 space-y-1">
                <span className="font-bold text-indigo-300 flex items-center gap-1.5 font-mono text-[10px] uppercase">
                  <Tag className="w-3 h-3 text-indigo-400" /> Key Topics
                </span>
                <div className="flex flex-wrap gap-1 pt-1">
                  {scanResult.key_topics.map((topic, i) => (
                    <span
                      key={i}
                      className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5 space-y-1">
                <span className="font-bold text-amber-300 flex items-center gap-1.5 font-mono text-[10px] uppercase">
                  <Target className="w-3 h-3 text-amber-400" /> Target Audience
                </span>
                <p className="text-slate-300 leading-normal">{scanResult.useful_for}</p>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Vision Chatbot Section */}
          <div className="flex flex-col rounded-2xl glass-panel border border-white/10 p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h4 className="text-sm font-bold text-gradient flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-cyan-400" />
                Ask Vision Chatbot Follow-up Questions
              </h4>
              <span className="text-[10px] font-mono text-slate-400">
                Groq LLM Engine
              </span>
            </div>

            {/* Prompt Suggestions */}
            <div className="flex flex-wrap gap-1.5">
              {promptSuggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendChatMessage(suggestion)}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 border border-white/10 transition-colors"
                >
                  💡 {suggestion}
                </button>
              ))}
            </div>

            {/* Chat Messages Feed */}
            <div className="flex-1 min-h-[220px] max-h-80 overflow-y-auto space-y-3 p-3.5 rounded-xl bg-slate-950/80 border border-white/10">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 text-xs ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {msg.role === "assistant" && (
                    <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}
                  <div
                    className={`p-3 rounded-2xl max-w-[85%] leading-relaxed ${
                      msg.role === "user"
                        ? "bg-cyan-600/30 border border-cyan-500/40 text-cyan-100 rounded-tr-none"
                        : "bg-slate-900/90 border border-white/10 text-slate-200 rounded-tl-none"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    <span className="block text-[9px] font-mono text-slate-400 mt-1">
                      {msg.timestamp} {msg.modelUsed ? `• ${msg.modelUsed}` : ""}
                    </span>
                  </div>
                  {msg.role === "user" && (
                    <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              ))}

              {isThinking && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-900/90 border border-cyan-500/30 text-cyan-300 text-xs animate-pulse">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                  Vision AI thinking...
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Chat Input Dock */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendChatMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={`Ask anything about ${scanResult.title}...`}
                disabled={isThinking}
                className="flex-1 px-4 py-2.5 rounded-xl bg-[#091a20]/60 border border-[#4a1f52]/60 text-[#d9f8ff] placeholder-[#5c8a93] text-sm focus:outline-none focus:border-[#ffc3ea] transition-colors"
              />
              {/* Voice mic for vision chatbot */}
              <VoiceMicButton
                onTranscript={(t) => setChatInput((prev) => prev ? `${prev} ${t}` : t)}
                size="sm"
              />
              <button
                type="submit"
                disabled={isThinking || !chatInput.trim()}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#4a1f52] to-[#d688d6] text-[#d9f8ff] font-['Orbitron',sans-serif] font-bold border border-[#ffc3ea]/40 text-xs flex items-center gap-1.5 transition-all disabled:opacity-40 cursor-pointer hover:border-[#ffc3ea]"
              >
                <Send className="w-3.5 h-3.5" /> Send
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
