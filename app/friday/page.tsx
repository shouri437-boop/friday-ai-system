'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as THREE from 'three';

export default function FridayCorePage() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [active, setActive] = useState(false);
  const [statusText, setStatusText] = useState('STANDBY');
  const [subText, setSubText] = useState('TAP THE CORE TO INITIALIZE');
  const [linkedCount, setLinkedCount] = useState('0 / 3');
  const [timeStr, setTimeStr] = useState('00:00:00');
  const activeRef = useRef(false);
  const targetZRef = useRef(6.2);

  // Clock updater
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const ss = String(now.getSeconds()).padStart(2, '0');
      setTimeStr(`${hh}:${mm}:${ss}`);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  // ── Welcome, Master — Speak on load (female voice) ──────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const greet = () => {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance('Welcome, Master.');
      utterance.pitch = 1.15;
      utterance.rate = 0.95;
      utterance.volume = 1.0;

      // Select female voice with same priority list
      const voices = window.speechSynthesis.getVoices();
      const preferred = [
        'Google UK English Female',
        'Microsoft Zira - English (United States)',
        'Microsoft Hazel Desktop - English (Great Britain)',
        'Samantha', 'Karen', 'Moira', 'Tessa', 'Veena', 'Victoria',
      ];
      let femaleVoice: SpeechSynthesisVoice | null = null;
      for (const name of preferred) {
        const match = voices.find((v) => v.name === name);
        if (match) { femaleVoice = match; break; }
      }
      if (!femaleVoice) {
        femaleVoice = voices.find((v) => /female/i.test(v.name) && v.lang.startsWith('en')) || null;
      }
      if (!femaleVoice) {
        femaleVoice = voices.find((v) => v.lang.startsWith('en')) || null;
      }
      if (femaleVoice) utterance.voice = femaleVoice;

      window.speechSynthesis.speak(utterance);
    };

    // Small delay so browser audio context is unlocked, then greet
    const timer = setTimeout(() => {
      if (window.speechSynthesis.getVoices().length === 0) {
        window.speechSynthesis.onvoiceschanged = () => {
          window.speechSynthesis.onvoiceschanged = null;
          greet();
        };
      } else {
        greet();
      }
    }, 800);

    return () => {
      clearTimeout(timer);
      window.speechSynthesis.cancel();
    };
  }, []);
  // ────────────────────────────────────────────────────────────────────────────

  // ---------------- Three.js 3D Core Scene ----------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 6.2);

    const coreGroup = new THREE.Group();
    scene.add(coreGroup);

    // Fibonacci sphere distribution
    const COUNT = 2600;
    const BASE_RADIUS = 1.6;
    const positions = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);
    const baseDirs = new Float32Array(COUNT * 3);
    const phases = new Float32Array(COUNT);

    const offset = 2 / COUNT;
    const increment = Math.PI * (3 - Math.sqrt(5));

    for (let i = 0; i < COUNT; i++) {
      const y = i * offset - 1 + offset / 2;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const phi = (i % COUNT) * increment;
      const x = Math.cos(phi) * r;
      const z = Math.sin(phi) * r;

      baseDirs[i * 3] = x;
      baseDirs[i * 3 + 1] = y;
      baseDirs[i * 3 + 2] = z;

      positions[i * 3] = x * BASE_RADIUS;
      positions[i * 3 + 1] = y * BASE_RADIUS;
      positions[i * 3 + 2] = z * BASE_RADIUS;

      const light = 0.78 + Math.random() * 0.2;
      const sat = 0.25 + Math.random() * 0.3;
      const c = new THREE.Color();
      c.setHSL(0.92, sat, light);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;

      phases[i] = Math.random() * Math.PI * 2;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    const points = new THREE.Points(geometry, material);
    coreGroup.add(points);

    // Inner glow sprite
    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = glowCanvas.height = 256;
    const gctx = glowCanvas.getContext('2d');
    if (gctx) {
      const grad = gctx.createRadialGradient(128, 128, 0, 128, 128, 128);
      grad.addColorStop(0, 'rgba(255,195,234,0.42)');
      grad.addColorStop(0.5, 'rgba(198,110,220,0.14)');
      grad.addColorStop(1, 'rgba(154,60,180,0)');
      gctx.fillStyle = grad;
      gctx.fillRect(0, 0, 256, 256);
    }
    const glowTex = new THREE.CanvasTexture(glowCanvas);
    const glowMat = new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const glowSprite = new THREE.Sprite(glowMat);
    glowSprite.scale.set(4.6, 4.6, 1);
    coreGroup.add(glowSprite);

    // Hit sphere
    const hitGeo = new THREE.SphereGeometry(BASE_RADIUS + 0.35, 16, 16);
    const hitMat = new THREE.MeshBasicMaterial({ visible: false });
    const hitSphere = new THREE.Mesh(hitGeo, hitMat);
    coreGroup.add(hitSphere);

    let mouseX = 0;
    let mouseY = 0;

    const onPointerMove = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('mousemove', onPointerMove);

    const raycaster = new THREE.Raycaster();
    const mouseVec = new THREE.Vector2();

    const handleCanvasClick = (e: MouseEvent) => {
      mouseVec.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseVec.y = -(e.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouseVec, camera);
      const hits = raycaster.intersectObject(hitSphere);
      if (hits.length > 0) {
        const nextState = !activeRef.current;
        activeRef.current = nextState;
        setActive(nextState);
        targetZRef.current = nextState ? 7.1 : 6.2;
        setSubText(nextState ? 'SELECT A MODULE' : 'TAP THE CORE TO INITIALIZE');
        setStatusText(nextState ? 'AWAITING INPUT' : 'STANDBY');
        if (!nextState) {
          setLinkedCount('0 / 3');
        }
      }
    };
    canvas.addEventListener('click', handleCanvasClick);

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    const posAttr = geometry.attributes.position;
    const clock = new THREE.Clock();
    let animId: number;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      for (let i = 0; i < COUNT; i++) {
        const dx = baseDirs[i * 3];
        const dy = baseDirs[i * 3 + 1];
        const dz = baseDirs[i * 3 + 2];
        const wobble = Math.sin(t * 1.1 + phases[i]) * 0.045;
        const r = BASE_RADIUS + wobble;
        posAttr.array[i * 3] = dx * r;
        posAttr.array[i * 3 + 1] = dy * r;
        posAttr.array[i * 3 + 2] = dz * r;
      }
      posAttr.needsUpdate = true;

      coreGroup.rotation.y += activeRef.current ? 0.0022 : 0.0014;
      coreGroup.rotation.x = Math.sin(t * 0.25) * 0.06;

      const bob = Math.sin(t * 0.6) * 0.14;
      coreGroup.position.y = bob;

      coreGroup.rotation.y += mouseX * 0.0003;
      coreGroup.rotation.x += mouseY * 0.0002;

      camera.position.z += (targetZRef.current - camera.position.z) * 0.06;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('click', handleCanvasClick);
      cancelAnimationFrame(animId);
    };
  }, []);

  const handleModuleClick = (moduleName: string, path: string) => {
    setSubText(`${moduleName} — INITIALIZING`);
    setStatusText('LINKED');
    setLinkedCount('1 / 3');
    setTimeout(() => {
      router.push(path);
    }, 400);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#05020c] font-['Rajdhani',sans-serif] text-[#d9f8ff] select-none">
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

      {/* 3D Canvas */}
      <canvas ref={canvasRef} className="fixed inset-0 block cursor-pointer z-10" />

      {/* Corner Brackets */}
      <div className="fixed top-4 left-4 w-8 h-8 border-l border-t border-[#d688d6]/40 z-20 pointer-events-none" />
      <div className="fixed top-4 right-4 w-8 h-8 border-r border-t border-[#d688d6]/40 z-20 pointer-events-none" />
      <div className="fixed bottom-4 left-4 w-8 h-8 border-l border-b border-[#d688d6]/40 z-20 pointer-events-none" />
      <div className="fixed bottom-4 right-4 w-8 h-8 border-r border-b border-[#d688d6]/40 z-20 pointer-events-none" />

      {/* ── Welcome, Master Heading ── */}
      <div className="fixed top-0 left-0 right-0 flex justify-center pt-8 z-30 pointer-events-none">
        <div className="text-center space-y-1">
          <h1
            className="font-['Orbitron',sans-serif] font-black tracking-[0.35em] text-transparent bg-clip-text select-none"
            style={{
              fontSize: 'clamp(1.4rem, 3.5vw, 2.6rem)',
              backgroundImage: 'linear-gradient(90deg, #d688d6 0%, #ffc3ea 50%, #d688d6 100%)',
              textShadow: '0 0 40px rgba(255,195,234,0.55)',
              letterSpacing: '0.35em',
            }}
          >
            WELCOME, MASTER
          </h1>
          <div
            className="font-['Rajdhani',sans-serif] text-xs tracking-[0.28em] font-semibold"
            style={{ color: 'rgba(92,138,147,0.85)' }}
          >
            F.R.I.D.A.Y CORE SYSTEMS READY
          </div>
        </div>
      </div>

      {/* Chrome Overlay */}
      <div className="fixed top-6 left-6 text-[0.68rem] tracking-[0.18em] text-[#5c8a93] z-20 pointer-events-none">
        F.R.I.D.A.Y <b className="text-[#d688d6] font-semibold">OS</b>
        <br />
        BUILD 4.6.0
      </div>
      <div className="fixed top-6 right-6 text-[0.68rem] tracking-[0.18em] text-[#5c8a93] text-right z-20 pointer-events-none">
        {timeStr}
        <br />
        <span className="opacity-60">
          SYS. <b className="text-emerald-400 font-semibold">ONLINE</b>
        </span>
      </div>
      <div className="fixed bottom-6 left-6 text-[0.68rem] tracking-[0.18em] text-[#5c8a93] z-20 pointer-events-none">
        CORE STATUS
        <br />
        <b className="text-[#d688d6] font-semibold">{statusText}</b>
      </div>
      <div className="fixed bottom-6 right-6 text-[0.68rem] tracking-[0.18em] text-[#5c8a93] text-right z-20 pointer-events-none">
        MODULES LINKED
        <br />
        <b className="text-[#d688d6] font-semibold">{linkedCount}</b>
      </div>

      {/* Side Panel Buttons */}
      <div className="fixed left-6 top-24 flex flex-col gap-3.5 z-30">
        <button
          onClick={() => router.push('/settings')}
          className="flex items-center gap-2.5 px-4 py-2.5 border border-[#4a1f52] bg-gradient-to-b from-[#091a20]/45 to-[#030a0e]/45 backdrop-blur-sm hover:border-[#ffc3ea] hover:shadow-[0_0_20px_rgba(255,195,234,0.2)] hover:translate-x-1 transition-all cursor-pointer text-left"
          style={{ clipPath: 'polygon(0 0, 100% 0, 100% 70%, 88% 100%, 0 100%)' }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#d688d6] shadow-[0_0_8px_rgba(255,195,234,0.35)]" />
          <span className="font-['Orbitron',sans-serif] font-bold text-[0.72rem] tracking-[0.16em] text-[#d9f8ff]">
            SETTINGS
          </span>
        </button>

        <button
          onClick={() => router.push('/tasks')}
          className="flex items-center gap-2.5 px-4 py-2.5 border border-[#4a1f52] bg-gradient-to-b from-[#091a20]/45 to-[#030a0e]/45 backdrop-blur-sm hover:border-[#ffc3ea] hover:shadow-[0_0_20px_rgba(255,195,234,0.2)] hover:translate-x-1 transition-all cursor-pointer text-left"
          style={{ clipPath: 'polygon(0 0, 100% 0, 100% 70%, 88% 100%, 0 100%)' }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#d688d6] shadow-[0_0_8px_rgba(255,195,234,0.35)]" />
          <span className="font-['Orbitron',sans-serif] font-bold text-[0.72rem] tracking-[0.16em] text-[#d9f8ff]">
            TASKS
          </span>
        </button>
      </div>

      {/* Center HUD Overlay & Option Ring */}
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-20">
        <div className="relative w-px h-px">
          {/* Connecting Lines */}
          <div
            className={`absolute left-1/2 top-1/2 w-px h-[210px] origin-top bg-gradient-to-b from-transparent via-[#d688d6]/50 to-[#ffc3ea]/80 transition-opacity duration-700 ${
              active ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ transform: 'translate(-50%, 0) rotate(180deg)' }}
          />
          <div
            className={`absolute left-1/2 top-1/2 w-px h-[210px] origin-top bg-gradient-to-b from-transparent via-[#d688d6]/50 to-[#ffc3ea]/80 transition-opacity duration-700 ${
              active ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ transform: 'translate(-50%, 0) rotate(60deg)' }}
          />
          <div
            className={`absolute left-1/2 top-1/2 w-px h-[210px] origin-top bg-gradient-to-b from-transparent via-[#d688d6]/50 to-[#ffc3ea]/80 transition-opacity duration-700 ${
              active ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ transform: 'translate(-50%, 0) rotate(-60deg)' }}
          />

          {/* Module Nodes */}
          {/* MODULE 01: MASTER AI -> /chat */}
          <div
            onClick={() => handleModuleClick('MASTER AI', '/chat')}
            className={`absolute left-1/2 top-1/2 w-[130px] p-3 text-center border border-[#4a1f52] bg-gradient-to-b from-[#091a20]/60 to-[#030a0e]/60 backdrop-blur-sm hover:border-[#ffc3ea] hover:bg-[#143c46]/60 hover:shadow-[0_0_24px_rgba(255,195,234,0.25)] transition-all duration-500 cursor-pointer pointer-events-auto ${
              active ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none'
            }`}
            style={{
              clipPath: 'polygon(12% 0, 88% 0, 100% 30%, 100% 100%, 0 100%, 0 30%)',
              transform: 'translate(-50%, calc(-50% - 210px))',
            }}
          >
            <span className="block font-['Orbitron',sans-serif] text-[0.6rem] tracking-[0.2em] text-[#d688d6]/70 mb-1">
              MODULE 01
            </span>
            <span className="block font-['Orbitron',sans-serif] font-bold text-xs tracking-wider text-[#d9f8ff]">
              MASTER AI
            </span>
          </div>

          {/* MODULE 02: VISION AI -> /vision */}
          <div
            onClick={() => handleModuleClick('VISION AI', '/vision')}
            className={`absolute left-1/2 top-1/2 w-[130px] p-3 text-center border border-[#4a1f52] bg-gradient-to-b from-[#091a20]/60 to-[#030a0e]/60 backdrop-blur-sm hover:border-[#ffc3ea] hover:bg-[#143c46]/60 hover:shadow-[0_0_24px_rgba(255,195,234,0.25)] transition-all duration-500 cursor-pointer pointer-events-auto ${
              active ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none'
            }`}
            style={{
              clipPath: 'polygon(12% 0, 88% 0, 100% 30%, 100% 100%, 0 100%, 0 30%)',
              transform: 'translate(calc(-50% + 210px * 0.866), calc(-50% + 210px * 0.5))',
            }}
          >
            <span className="block font-['Orbitron',sans-serif] text-[0.6rem] tracking-[0.2em] text-[#d688d6]/70 mb-1">
              MODULE 02
            </span>
            <span className="block font-['Orbitron',sans-serif] font-bold text-xs tracking-wider text-[#d9f8ff]">
              VISION AI
            </span>
          </div>

          {/* MODULE 03: CAMPUS AI -> /echo26 */}
          <div
            onClick={() => handleModuleClick('CAMPUS AI', '/echo26')}
            className={`absolute left-1/2 top-1/2 w-[130px] p-3 text-center border border-[#4a1f52] bg-gradient-to-b from-[#091a20]/60 to-[#030a0e]/60 backdrop-blur-sm hover:border-[#ffc3ea] hover:bg-[#143c46]/60 hover:shadow-[0_0_24px_rgba(255,195,234,0.25)] transition-all duration-500 cursor-pointer pointer-events-auto ${
              active ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none'
            }`}
            style={{
              clipPath: 'polygon(12% 0, 88% 0, 100% 30%, 100% 100%, 0 100%, 0 30%)',
              transform: 'translate(calc(-50% - 210px * 0.866), calc(-50% + 210px * 0.5))',
            }}
          >
            <span className="block font-['Orbitron',sans-serif] text-[0.6rem] tracking-[0.2em] text-[#d688d6]/70 mb-1">
              MODULE 03
            </span>
            <span className="block font-['Orbitron',sans-serif] font-bold text-xs tracking-wider text-[#d9f8ff]">
              CAMPUS AI
            </span>
          </div>

          {/* Core Text Label */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
            <div className="font-['Orbitron',sans-serif] font-bold text-3xl tracking-[0.42em] text-[#d9f8ff] drop-shadow-[0_0_18px_rgba(255,195,234,0.35)] ml-[0.42em]">
              FRIDAY
            </div>
            <div className="mt-3 font-['Rajdhani',sans-serif] text-xs tracking-[0.32em] text-[#5c8a93] font-semibold animate-pulse">
              {subText}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
