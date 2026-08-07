'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Fingerprint, ShieldCheck, ShieldX, Usb, Loader2, Wifi } from 'lucide-react';

// ─── Web Serial API type augmentation ────────────────────────────────────────
declare global {
  interface Navigator {
    serial?: {
      requestPort: (options?: { filters?: { usbVendorId?: number }[] }) => Promise<SerialPort>;
      getPorts: () => Promise<SerialPort[]>;
    };
  }
  interface SerialPort {
    open: (options: { baudRate: number }) => Promise<void>;
    close: () => Promise<void>;
    readable: ReadableStream<Uint8Array> | null;
    writable: WritableStream<Uint8Array> | null;
  }
}
// ─────────────────────────────────────────────────────────────────────────────

type BiometricStatus =
  | 'idle'           // not started
  | 'connecting'     // opening COM port
  | 'waiting'        // connected, waiting for RFID scan
  | 'granted'        // ESP32 said ACCESS GRANTED
  | 'denied'         // ESP32 said ACCESS DENIED
  | 'error';         // connection / API error

export default function LoginPage() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [username, setUsername] = useState('Sriram');
  const [password, setPassword] = useState('••••••••');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // ESP32 Serial Auth State
  const [biometricStatus, setBiometricStatus] = useState<BiometricStatus>('idle');
  const [biometricMsg, setBiometricMsg] = useState('');
  const [baudRate, setBaudRate] = useState<number>(115200);
  const [hasGarbledData, setHasGarbledData] = useState<boolean>(false);
  const portRef = useRef<SerialPort | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);

  // Background sprinkle particle animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const particles: Array<{
      x: number; y: number; size: number;
      speedY: number; opacity: number; fade: number;
    }> = [];

    for (let i = 0; i < 45; i++) {
      particles.push({
        x: Math.random() * w, y: Math.random() * h,
        size: Math.random() * 1.8 + 0.6,
        speedY: Math.random() * -0.4 - 0.1,
        opacity: Math.random() * 0.5 + 0.2,
        fade: Math.random() * 0.008 + 0.002,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      particles.forEach((p) => {
        p.y += p.speedY;
        p.opacity -= p.fade;
        if (p.y < -10 || p.opacity <= 0) {
          p.x = Math.random() * w;
          p.y = h + 10;
          p.opacity = Math.random() * 0.5 + 0.2;
        }
        ctx.fillStyle = `rgba(255, 195, 234, ${p.opacity})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
    };
  }, []);

  // 3D Card tilt
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    const rotX = (-y / (rect.height / 2)) * 8;
    const rotY = (x / (rect.width / 2)) * 8;
    card.style.transform = `perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(1.01)`;
  };

  const handleMouseLeave = () => {
    const card = cardRef.current;
    if (!card) return;
    card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)`;
  };

  // ── Standard credential login ─────────────────────────────────────────────
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);
    setTimeout(() => { router.push('/friday'); }, 600);
  };

  // ── Clean up serial connection ────────────────────────────────────────────
  const cleanupSerial = async () => {
    try {
      readerRef.current?.cancel();
      readerRef.current?.releaseLock();
    } catch (_) {}
    readerRef.current = null;
    try {
      await portRef.current?.close();
    } catch (_) {}
    portRef.current = null;
  };

  // ── Identity Authorization via ESP32 Web Serial ───────────────────────────
  const handleESP32Auth = async () => {
    if (!navigator.serial) {
      setBiometricStatus('error');
      setBiometricMsg('Web Serial API not supported. Use Chrome or Edge browser.');
      return;
    }

    setBiometricStatus('connecting');
    setBiometricMsg(`Opening COM port at ${baudRate} baud...`);
    setHasGarbledData(false);

    try {
      // Open browser COM port picker
      const port = await navigator.serial.requestPort();
      portRef.current = port;

      await port.open({ baudRate });

      setBiometricStatus('waiting');
      setBiometricMsg('Scan your RFID card now...');

      if (!port.readable) {
        throw new Error('Port not readable');
      }

      const reader = port.readable.getReader();
      readerRef.current = reader;

      const decoder = new TextDecoder('utf-8', { fatal: false });
      let accumBuffer = '';
      let rawBuffer = '';

      // Comprehensive list of DENIED keywords printed by standard RFID sketches
      const deniedKeywords = [
        'ACCESS DENIED',
        'DENIED',
        'UNAUTHORIZED',
        'INVALID UID',
        'WRONG UID',
        'WRONG CARD',
        'INVALID CARD',
        'NOT AUTHORIZED',
        'CARD DENIED',
        'ACCESS REFUSED',
        'REJECTED',
        'NO MATCH',
        'UNKNOWN CARD',
        'FAIL',
        'FAILED',
        'REFUSED',
      ];

      // Comprehensive list of GRANTED keywords printed by RFID sketches
      const grantedKeywords = [
        'ACCESS GRANTED',
        'GRANTED',
        'AUTHORIZED',
        'ACCESS ALLOWED',
        'SUCCESS',
        'WELCOME',
        'CARD ACCEPTED',
        'MATCH',
      ];

      // Read serial chunks continuously until a clear response comes
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        // Decode incoming bytes and append
        const chunk = decoder.decode(value, { stream: true });
        rawBuffer += chunk;

        // Check if raw bytes contain replacement characters (\uFFFD), indicating baud rate mismatch
        if (rawBuffer.includes('\uFFFD')) {
          setHasGarbledData(true);
        }

        // Clean buffer: remove replacement chars and non-printable control chars
        const cleanChunk = chunk.replace(/\uFFFD/g, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
        accumBuffer += cleanChunk;

        // Show live cleaned serial output in the UI
        const displayText = accumBuffer
          .replace(/[\r\n]+/g, '  ')
          .trim()
          .slice(-120);

        setBiometricMsg(displayText ? `ESP32 → ${displayText}` : 'ESP32 → Waiting for RFID scan...');

        // Simple case-insensitive contains — works regardless of line endings or spacing
        const upperClean = accumBuffer.toUpperCase();
        const upperRaw = rawBuffer.toUpperCase();

        const isGranted = grantedKeywords.some(
          (kw) => upperClean.includes(kw) || upperRaw.includes(kw)
        );
        const isDenied = deniedKeywords.some(
          (kw) => upperClean.includes(kw) || upperRaw.includes(kw)
        );

        // Helper to send signal to ESP32 over Serial
        const sendSerialSignal = async (signal: string) => {
          if (portRef.current && portRef.current.writable) {
            try {
              const writer = portRef.current.writable.getWriter();
              await writer.write(new TextEncoder().encode(signal));
              writer.releaseLock();
            } catch (_) {}
          }
        };

        if (isGranted) {
          setBiometricStatus('granted');
          setBiometricMsg('Identity Verified. Access Granted.');

          // Send serial feedback ('GRANTED\n1\n') to ESP32 to trigger Green LED / Buzzer
          await sendSerialSignal('GRANTED\n1\n');

          // Keep serial port open for 1.5s so ESP32 buzzer/LED completes before port reset
          setTimeout(async () => {
            await cleanupSerial();
            router.push('/friday');
          }, 1500);
          return;
        }

        if (isDenied) {
          setBiometricStatus('denied');
          setBiometricMsg('Access Denied. Unauthorized UID detected.');

          // Send serial feedback ('DENIED\n0\n') to ESP32 to trigger Red LED / Warning Buzzer
          await sendSerialSignal('DENIED\n0\n');

          // Keep serial port open for 3s so ESP32 warning buzzer & red LED finish playing before reset
          setTimeout(async () => {
            await cleanupSerial();
          }, 3000);
          return;
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      // User cancelled the port picker
      if (msg.includes('No port selected') || msg.includes('cancelled')) {
        setBiometricStatus('idle');
        setBiometricMsg('');
      } else {
        setBiometricStatus('error');
        setBiometricMsg(`Connection error: ${msg}`);
        await cleanupSerial();
      }
    }
  };

  const handleResetBiometric = async () => {
    await cleanupSerial();
    setBiometricStatus('idle');
    setBiometricMsg('');
    setHasGarbledData(false);
  };

  // ── Render Biometric Status Panel ────────────────────────────────────────
  const renderBiometricStatus = () => {
    if (biometricStatus === 'idle') return null;

    const configs = {
      connecting: {
        icon: <Usb className="w-7 h-7 animate-pulse text-[#ffc3ea]" />,
        border: 'border-[#d688d6]/50',
        bg: 'from-[#1e0e2a]/80 to-[#060a12]/90',
        textColor: 'text-[#d9f8ff]',
      },
      waiting: {
        icon: <Wifi className="w-7 h-7 animate-bounce text-[#ffc3ea]" />,
        border: 'border-[#ffc3ea]/60',
        bg: 'from-[#1e0e2a]/80 to-[#060a12]/90',
        textColor: 'text-[#ffc3ea]',
      },
      granted: {
        icon: <ShieldCheck className="w-7 h-7 text-emerald-400" />,
        border: 'border-emerald-400/60',
        bg: 'from-emerald-950/60 to-[#060a12]/90',
        textColor: 'text-emerald-300',
      },
      denied: {
        icon: <ShieldX className="w-7 h-7 text-rose-400" />,
        border: 'border-rose-500/60',
        bg: 'from-rose-950/60 to-[#060a12]/90',
        textColor: 'text-rose-300',
      },
      error: {
        icon: <ShieldX className="w-7 h-7 text-rose-400" />,
        border: 'border-rose-500/60',
        bg: 'from-rose-950/60 to-[#060a12]/90',
        textColor: 'text-rose-300',
      },
    };

    const cfg = configs[biometricStatus];

    return (
      <div className={`mt-4 p-4 rounded-xl border ${cfg.border} bg-gradient-to-b ${cfg.bg} backdrop-blur-md flex flex-col items-center gap-3`}>
        {cfg.icon}
        <p className={`text-xs text-center font-['Orbitron',sans-serif] font-bold tracking-wider ${cfg.textColor}`}>
          {biometricMsg}
        </p>

        {/* Warning if baud rate mismatch causes replacement characters (\uFFFD / ?) */}
        {hasGarbledData && biometricStatus === 'waiting' && (
          <div className="mt-1 p-2 rounded-lg bg-amber-950/60 border border-amber-500/50 text-amber-300 text-[10px] text-center font-mono">
            ⚠️ Garbled serial bytes detected (question marks).
            <br />
            Ensure Baud Rate matches your ESP32 <code className="bg-black/40 px-1 rounded">Serial.begin(...)</code> speed (try 115200 vs 9600).
          </div>
        )}

        {/* Pulsing scan animation while waiting */}
        {biometricStatus === 'waiting' && (
          <div className="flex gap-1 mt-1">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="w-1 bg-[#ffc3ea] rounded-full animate-pulse"
                style={{ height: `${10 + (i % 3) * 6}px`, animationDelay: `${i * 0.12}s` }}
              />
            ))}
          </div>
        )}

        {/* Manual Test Signal Button */}
        {(biometricStatus === 'waiting' || biometricStatus === 'denied') && (
          <div className="flex gap-2 mt-1">
            <button
              type="button"
              onClick={async () => {
                if (portRef.current && portRef.current.writable) {
                  try {
                    const writer = portRef.current.writable.getWriter();
                    await writer.write(new TextEncoder().encode('DENIED\n0\n'));
                    writer.releaseLock();
                  } catch (e) {
                    console.error('Failed to send test signal:', e);
                  }
                }
              }}
              className="px-3 py-1 rounded border border-rose-500/50 text-rose-300 font-mono text-[9px] hover:bg-rose-950/40 transition-all cursor-pointer"
            >
              🔔 Test Denied Signal (0)
            </button>
            <button
              type="button"
              onClick={async () => {
                if (portRef.current && portRef.current.writable) {
                  try {
                    const writer = portRef.current.writable.getWriter();
                    await writer.write(new TextEncoder().encode('GRANTED\n1\n'));
                    writer.releaseLock();
                  } catch (e) {
                    console.error('Failed to send test signal:', e);
                  }
                }
              }}
              className="px-3 py-1 rounded border border-emerald-500/50 text-emerald-300 font-mono text-[9px] hover:bg-emerald-950/40 transition-all cursor-pointer"
            >
              ⚡ Test Granted Signal (1)
            </button>
          </div>
        )}

        {/* Reset button on denied/error */}
        {(biometricStatus === 'denied' || biometricStatus === 'error') && (
          <button
            onClick={handleResetBiometric}
            className="mt-1 px-4 py-1.5 rounded-lg border border-[#d688d6]/40 text-[#d688d6] font-['Orbitron',sans-serif] font-bold text-[10px] tracking-widest hover:border-[#ffc3ea] hover:text-[#ffc3ea] transition-all cursor-pointer"
          >
            TRY AGAIN
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#05020c] font-['Rajdhani',sans-serif] text-[#d9f8ff] select-none flex items-center justify-center">
      {/* Background Gradients & Grid */}
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
      <div
        className="fixed inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: `
            linear-gradient(rgba(214,136,214,0.045) 1px, transparent 1px),
            linear-gradient(90deg, rgba(214,136,214,0.045) 1px, transparent 1px)
          `,
          backgroundSize: '42px 42px',
          maskImage: 'radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0.9) 0%, transparent 68%)',
        }}
      />
      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-10" />

      {/* Futuristic Corner Brackets */}
      <div className="fixed top-4 left-4 w-8 h-8 border-l border-t border-[#d688d6]/40 z-20 pointer-events-none" />
      <div className="fixed top-4 right-4 w-8 h-8 border-r border-t border-[#d688d6]/40 z-20 pointer-events-none" />
      <div className="fixed bottom-4 left-4 w-8 h-8 border-l border-b border-[#d688d6]/40 z-20 pointer-events-none" />
      <div className="fixed bottom-4 right-4 w-8 h-8 border-r border-b border-[#d688d6]/40 z-20 pointer-events-none" />

      {/* Chrome Overlay */}
      <div className="fixed top-6 left-6 text-[0.68rem] tracking-[0.18em] text-[#5c8a93] z-20 pointer-events-none">
        F.R.I.D.A.Y <b className="text-[#d688d6] font-semibold">OS</b>
        <br />
        AUTHENTICATION MODULE
      </div>
      <div className="fixed top-6 right-6 text-[0.68rem] tracking-[0.18em] text-[#5c8a93] text-right z-20 pointer-events-none">
        SECURITY LEVEL <b className="text-[#d688d6] font-semibold">ALPHA</b>
        <br />
        STATUS: <b className="text-emerald-400">READY</b>
      </div>

      {/* Login Card Stage */}
      <div className="relative z-30 p-4">
        <div
          ref={cardRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="w-[380px] max-w-[92vw] p-8 rounded-2xl border border-[#d688d6]/30 bg-gradient-to-b from-[#1e0e2a]/70 to-[#060a12]/80 backdrop-blur-md shadow-[0_30px_60px_rgba(0,0,0,0.6),0_0_50px_rgba(140,50,160,0.25)] transition-transform duration-150 ease-out"
        >
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="font-['Orbitron',sans-serif] font-black text-2xl tracking-[0.35em] text-[#d9f8ff] drop-shadow-[0_0_12px_rgba(255,195,234,0.4)]">
              F.R.I.D.A.Y
            </h1>
            <p className="mt-2 text-[0.7rem] tracking-[0.25em] text-[#5c8a93] uppercase font-semibold">
              AI Chief of Staff — Access Control
            </p>
          </div>

          {/* ── Divider: "OR" separator ── */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-[#d688d6]/20" />
            <span className="text-[10px] font-mono text-[#5c8a93] tracking-widest">CHOOSE AUTH METHOD</span>
            <div className="flex-1 h-px bg-[#d688d6]/20" />
          </div>

          {/* ── METHOD 1: Identity Authorization via ESP32 ── */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5 px-1">
              <span className="text-[10px] font-mono text-[#d688d6] tracking-wider uppercase">Serial Baud Rate:</span>
              <select
                value={baudRate}
                onChange={(e) => setBaudRate(Number(e.target.value))}
                disabled={biometricStatus === 'connecting' || biometricStatus === 'waiting' || biometricStatus === 'granted'}
                className="bg-[#091a20] border border-[#4a1f52] text-[#ffc3ea] text-[10px] font-mono px-2 py-0.5 rounded focus:outline-none focus:border-[#ffc3ea] cursor-pointer disabled:opacity-50"
              >
                <option value={115200}>115200 (ESP32 Standard)</option>
                <option value={9600}>9600 Baud</option>
                <option value={57600}>57600 Baud</option>
                <option value={38400}>38400 Baud</option>
              </select>
            </div>

            <button
              type="button"
              onClick={biometricStatus === 'idle' || biometricStatus === 'denied' || biometricStatus === 'error'
                ? handleESP32Auth
                : undefined}
              disabled={biometricStatus === 'connecting' || biometricStatus === 'waiting' || biometricStatus === 'granted'}
              className="w-full py-3.5 px-5 rounded-xl border border-[#ffc3ea]/50 bg-gradient-to-r from-[#4a1f52]/60 via-[#d688d6]/20 to-[#4a1f52]/60 text-[#ffc3ea] font-['Orbitron',sans-serif] font-bold text-xs tracking-[0.2em] uppercase hover:border-[#ffc3ea] hover:shadow-[0_0_24px_rgba(255,195,234,0.45)] transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {biometricStatus === 'connecting' || biometricStatus === 'waiting' ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#ffc3ea]" />
              ) : (
                <Fingerprint className="w-5 h-5 text-[#ffc3ea]" />
              )}
              Identity Authorization
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#4a1f52]/80 border border-[#d688d6]/40 font-mono tracking-widest">
                ESP32 RFID
              </span>
            </button>
          </div>

          {/* Biometric Status Panel */}
          {renderBiometricStatus()}

          {/* ── Divider ── */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-[#d688d6]/20" />
            <span className="text-[10px] font-mono text-[#5c8a93] tracking-widest">OR</span>
            <div className="flex-1 h-px bg-[#d688d6]/20" />
          </div>

          {/* ── METHOD 2: Standard credential login ── */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[0.68rem] tracking-[0.2em] text-[#d688d6] font-semibold mb-1 uppercase">
                Operator ID / Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-lg border border-[#4a1f52] bg-[#091a20]/60 text-[#d9f8ff] text-sm tracking-wider focus:outline-none focus:border-[#ffc3ea] focus:ring-1 focus:ring-[#ffc3ea] transition-all"
              />
            </div>

            <div>
              <label className="block text-[0.68rem] tracking-[0.2em] text-[#d688d6] font-semibold mb-1 uppercase">
                Access Credentials
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-lg border border-[#4a1f52] bg-[#091a20]/60 text-[#d9f8ff] text-sm tracking-wider focus:outline-none focus:border-[#ffc3ea] focus:ring-1 focus:ring-[#ffc3ea] transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isAuthenticating}
              className="w-full mt-2 py-3 rounded-lg border border-[#d688d6]/40 bg-gradient-to-r from-[#4a1f52]/60 via-[#d688d6]/25 to-[#4a1f52]/60 text-[#d9f8ff] font-['Orbitron',sans-serif] font-bold text-xs tracking-[0.25em] uppercase hover:border-[#ffc3ea] hover:shadow-[0_0_20px_rgba(255,195,234,0.35)] transition-all cursor-pointer disabled:opacity-50"
            >
              {isAuthenticating ? 'AUTHENTICATING...' : 'ACCESS F.R.I.D.A.Y CORE'}
            </button>
          </form>

          {/* Footer note */}
          <div className="mt-6 text-center text-[0.62rem] tracking-[0.18em] text-[#5c8a93]">
            NEURAL NETWORK STATUS: <span className="text-[#d688d6]">OPTIMAL</span>
          </div>
        </div>
      </div>
    </div>
  );
}
