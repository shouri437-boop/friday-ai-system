// routing.js — Dijkstra Campus Route Finder v9.0.0
// v9.0 FIXES:
//   1. 100% Strict Orthogonal Grid Navigation: Zero diagonal shortcuts! All indoor navigation lines now turn at right angles along the exact building corridors (z=40 North corridor, z=12.5 Central corridor, z=-20 South corridor, x=7.5 Main column, x=-20 West corridor, x=39.5 East corridor).
//   2. Skybridge Trajectory: B-Block to PG-Block evacuation moves North along the main corridor (x=7.5) to the North corridor (z=40), West along the North corridor to the West skybridge door (x=-20, z=40), across the skybridge to PG-Block (x=89, z=40), and into PG main corridor (x=95, z=40).
//   3. Room Exit Trajectory: Stepping out of rooms (e.g. b-417, b-418) enters the hallway line first before proceeding along corridor gridlines.
//   4. Depth-test overlay & renderOrder=999 enabled so interior corridor lines shine bright cyan inside building corridors in block selector & micro view.

(function (global) {
  'use strict';

  // ── MinHeap ───────────────────────────────────────────────────────────────
  class MinHeap {
    constructor() { this.h = []; }
    push(i) { this.h.push(i); this._up(this.h.length - 1); }
    pop() {
      const top = this.h[0], last = this.h.pop();
      if (this.h.length) { this.h[0] = last; this._down(0); }
      return top;
    }
    get size() { return this.h.length; }
    _up(i) {
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (this.h[p].d <= this.h[i].d) break;
        [this.h[p], this.h[i]] = [this.h[i], this.h[p]]; i = p;
      }
    }
    _down(i) {
      const n = this.h.length;
      for (;;) {
        let s = i, l = 2 * i + 1, r = 2 * i + 2;
        if (l < n && this.h[l].d < this.h[s].d) s = l;
        if (r < n && this.h[r].d < this.h[s].d) s = r;
        if (s === i) break;
        [this.h[s], this.h[i]] = [this.h[i], this.h[s]]; i = s;
      }
    }
  }

  // ── Edge Weights ──────────────────────────────────────────────────────────
  const W = {
    ROOM_HUB:   1,
    STAIR_HALF: 2,
    ENT_HUB:    2,
    ROAD_S:     5,
    ROAD_M:     12,
    ROAD_L:     20,
    PORTAL_A:   15, // Priority 2 fallback (Adjacent A-Block)
    PORTAL_PG:  30, // Priority 3 fallback (PG Skybridge)
    PORTAL_ALT: 60, // Secondary portals
    WARN_MULT:  3,
    WARNING_RISK: 100,
    HAZARD_BUFFER_RISK: 250,
    SAFETY_PRIORITY: 10000,
  };

  // ── Graph State ───────────────────────────────────────────────────────────
  const nodes   = new Map();
  const adj     = new Map();
  const hazards = new Set();

  const BLOCKS    = ['B-BLOCK','PG-BLOCK','D-BLOCK','E-BLOCK','A-BLOCK','C-BLOCK'];
  const BLOCK_KEY = { 'B-BLOCK':'b','PG-BLOCK':'pg','D-BLOCK':'d','E-BLOCK':'e','A-BLOCK':'a','C-BLOCK':'c' };
  const FLR_LBL   = ['Ground Floor','Floor 2','Floor 3','Floor 4','Floor 5'];

  function addNode(id, name, type, opts = {}) {
    if (!nodes.has(id)) { nodes.set(id, { id, name, type, ...opts }); adj.set(id, []); }
  }
  function addEdge(a, b, w) {
    if (!nodes.has(a) || !nodes.has(b)) return;
    adj.get(a).push({ to: b, weight: w });
    adj.get(b).push({ to: a, weight: w });
  }

  // ── Block lookup by room ID or coordinates ────────────────────────────────
  function getRoomBlock(roomId, rx, rz) {
    if (roomId.startsWith('pg-') || roomId.startsWith('pg_')) return 'PG-BLOCK';
    if (roomId.startsWith('d-')  || roomId.startsWith('d_'))  return 'D-BLOCK';
    if (roomId.startsWith('e-')  || roomId.startsWith('e_'))  return 'E-BLOCK';
    if (roomId.startsWith('a-')  || roomId.startsWith('a_'))  return 'A-BLOCK';
    if (roomId.startsWith('c-')  || roomId.startsWith('c_'))  return 'C-BLOCK';
    if (rx !== undefined && rz !== undefined) {
      if (rx > 70)  return rz < -50 ? 'D-BLOCK'  : 'PG-BLOCK';
      if (rx < -55) return rz < -50 ? 'E-BLOCK'  : 'A-BLOCK';
      if (rx < -30 && rz > -30) return 'A-BLOCK';
    }
    return 'B-BLOCK';
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  REAL 3-D POSITIONS — Synchronized 100% with main.js scene geometry
  // ══════════════════════════════════════════════════════════════════════════
  const FLOOR_Y = [0.3, 8.3, 16.3, 24.3, 32.3];

  const STAIR_COL = {
    'B-BLOCK':  { x: 7.5,  z: 12.5  },
    'PG-BLOCK': { x: 95,   z: 19.5  },
    'D-BLOCK':  { x: 95,   z: -72.5 },
    'E-BLOCK':  { x: -75,  z: -72.5 },
    'A-BLOCK':  { x: -20,  z: 40.0  }, // North corridor staircase between rooms 418 & 408/410
    'C-BLOCK':  { x: -42,  z: 12.5  },
  };

  const ENT_POS = {
    'B-BLOCK':  { x: 0,    y: 0.3, z: -27.5 },
    'PG-BLOCK': { x: 95,   y: 0.3, z: -1    },
    'D-BLOCK':  { x: 95,   y: 0.3, z: -55   },
    'E-BLOCK':  { x: -75,  y: 0.3, z: -55   },
    'A-BLOCK':  { x: -20,  y: 0.3, z: 40.0  }, // North exit on A-Block side (x=-20)
    'C-BLOCK':  { x: -42,  y: 0.3, z: -27.5 },
  };

  const ROAD_Z = -38; // Main campus road Z coordinate from main.js

  const STATIC_POS = {
    // Street junction nodes along main campus road
    'road_pg_front':      { x: 95,   y: 0.3, z: ROAD_Z },
    'road_b_front':       { x: 0,    y: 0.3, z: ROAD_Z },
    'road_a_front':       { x: -42,  y: 0.3, z: ROAD_Z },
    'road_e_front':       { x: -75,  y: 0.3, z: ROAD_Z },
    'road_canteen_front': { x: -125, y: 0.3, z: ROAD_Z },
    'road_open_ground':   { x: -236, y: 0.3, z: ROAD_Z },
    'vnr_circle':         { x: -330, y: 0.3, z: ROAD_Z },
    'road_peb_front':     { x: -420, y: 0.3, z: ROAD_Z },
    'main_gate':          { x: -510, y: 0.3, z: ROAD_Z },

    // Secondary road & outdoor landmarks
    'road_d_front':       { x: 95,   y: 0.3, z: -55 },
    'canteen':            { x: -125, y: 0.3, z: -20 },
    'jsk_greens':         { x: 60,   y: 0.3, z: -85 },

    // Building entrances & exits
    'b_entrance':         { x: 0,    y: 0.3, z: -27.5 },
    'b_east_exit':        { x: 39.5, y: 0.3, z: -27.5 },  // East-wing exit beside B-G05
    'pg_entrance':        { x: 95,   y: 0.3, z: -1    },
    'd_entrance':         { x: 95,   y: 0.3, z: -55   },
    'e_entrance':         { x: -75,  y: 0.3, z: -55   },
    'a_entrance':         { x: -20,  y: 0.3, z: 40.0  }, // North side exit for A-Block (x=-20)
    'c_entrance':         { x: -42,  y: 0.3, z: -27.5 },

    // East-Wing (Lab 1-4) floor corridor hubs — x=39.5, one per floor
    'b_east_f0':  { x: 39.5, y: 0.3,  z: 35.0 },
    'b_east_f1':  { x: 39.5, y: 8.3,  z: 35.0 },
    'b_east_f2':  { x: 39.5, y: 16.3, z: 35.0 },
    'b_east_f3':  { x: 39.5, y: 24.3, z: 35.0 },
    'b_east_f4':  { x: 39.5, y: 32.3, z: 35.0 },

    // East-Wing staircase segment midpoints
    'b_east_stair_0_1': { x: 39.5, y: 4.3,  z: 35.0 },
    'b_east_stair_1_2': { x: 39.5, y: 12.3, z: 35.0 },
    'b_east_stair_2_3': { x: 39.5, y: 20.3, z: 35.0 },
    'b_east_stair_3_4': { x: 39.5, y: 28.3, z: 35.0 },
  };

  function getNodePos(id) {
    if (STATIC_POS[id]) return { ...STATIC_POS[id] };
    const n = nodes.get(id);
    if (!n) return null;
    const col = STAIR_COL[n.block] || { x: 0, z: 0 };
    const fy  = FLOOR_Y[n.floor] ?? 0.3;
    if (n.type === 'floor_hub') return { x: col.x, y: fy, z: col.z };
    if (n.type === 'staircase') return { x: col.x, y: (n.posY ?? fy), z: col.z };
    if (n.type === 'entrance')  return ENT_POS[n.block] ? { ...ENT_POS[n.block] } : null;
    if (n.type === 'room')      return { x: n.rx ?? col.x, y: fy, z: n.rz ?? col.z };
    return null;
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  COMPOUND HAZARD PRESETS
  // ══════════════════════════════════════════════════════════════════════════
  const COMPOUND = {};
  BLOCKS.forEach(block => {
    const k = BLOCK_KEY[block];
    // Staircase segments for this block
    const stairIds = Array.from({ length: 4 }, (_, f) => `${k}_stair_${f}_${f + 1}`);
    const extraIds = [`${k}_entrance`, `${k}_f0`];

    // For B-Block, also include East-Wing lab staircases and East exit
    if (k === 'b') {
      for (let f = 0; f < 4; f++) stairIds.push(`b_east_stair_${f}_${f + 1}`);
      extraIds.push('b_east_f0', 'b_east_exit');
    }

    COMPOUND[`COMPOUND_STAIRS_${k}`] = [...stairIds, ...extraIds];
  });

  // Blockable exits (ground-floor escape doors, separate from staircase compound)
  const BLOCK_EXITS = {
    'B-BLOCK': ['b_east_exit', 'b_entrance'],
    'PG-BLOCK': ['pg_entrance'],
    'C-BLOCK': ['c_entrance'],
    'A-BLOCK': ['a_entrance'],
    'D-BLOCK': ['d_entrance'],
    'E-BLOCK': ['e_entrance'],
  };

  // ══════════════════════════════════════════════════════════════════════════
  //  GRAPH BUILDER
  // ══════════════════════════════════════════════════════════════════════════
  function buildGraph(campusData) {
    // Outdoor landmarks
    addNode('main_gate',   'Main Gate (West Entrance)', 'landmark');
    addNode('vnr_circle',  'VNR Circle (Roundabout)',   'landmark');
    addNode('canteen',     'Campus Canteen',            'landmark');
    addNode('jsk_greens',  'JSK Greens (Central Park)', 'landmark');

    // Sequential street nodes along main campus road
    addNode('road_pg_front',      'Main Street (PG Sector)',      'road');
    addNode('road_b_front',       'Main Street (B Sector)',       'road');
    addNode('road_a_front',       'Main Street (A Sector)',       'road');
    addNode('road_e_front',       'Main Street (E Sector)',       'road');
    addNode('road_canteen_front', 'Main Street (Canteen Sector)',  'road');
    addNode('road_open_ground',   'Main Street (Open Ground)',    'road');
    addNode('road_peb_front',     'Main Street (Parking Sector)', 'road');
    addNode('road_d_front',       'Campus Road (D Block Side)',   'road');

    // Block entrance nodes
    BLOCKS.forEach(block => {
      const k = BLOCK_KEY[block];
      addNode(`${k}_entrance`, `${block} — Main Entrance`, 'entrance', { block });
    });

    // ── East-Wing nodes (Lab 1-4 staircase + East Exit beside B-G05) ───────────
    // These are SEPARATE from main B-Block staircase compound — they stay open during fire!
    addNode('b_east_exit', 'B-Block East Exit (beside B-G05)', 'entrance', { block: 'B-BLOCK' });

    // East-wing per-floor corridor hubs (positioned at x=39.5 east corridor)
    for (let f = 0; f < 5; f++) {
      addNode(`b_east_f${f}`, `B-Block East Wing — ${FLR_LBL[f]} Corridor`, 'floor_hub',
        { block: 'B-BLOCK', floor: f, posY: FLOOR_Y[f] });
    }

    // East-wing staircase segment nodes (Lab 1–4 multi-floor staircase)
    for (let f = 0; f < 4; f++) {
      addNode(`b_east_stair_${f}_${f + 1}`,
        `East-Wing Lab Staircase: ${FLR_LBL[f]} ↔ ${FLR_LBL[f + 1]}`, 'staircase',
        { block: 'B-BLOCK', floor: f, posY: (FLOOR_Y[f] + FLOOR_Y[f + 1]) / 2 });
    }

    // Floor corridor hub nodes
    BLOCKS.forEach(block => {
      const k = BLOCK_KEY[block];
      for (let f = 0; f < 5; f++)
        addNode(`${k}_f${f}`, `${block} — ${FLR_LBL[f]} Corridor Hub`, 'floor_hub',
          { block, floor: f, posY: FLOOR_Y[f] });
    });

    // Staircase segment nodes
    BLOCKS.forEach(block => {
      const k = BLOCK_KEY[block];
      for (let f = 0; f < 4; f++) {
        const sid = `${k}_stair_${f}_${f + 1}`;
        addNode(sid, `${block} Staircase: ${FLR_LBL[f]} ↔ ${FLR_LBL[f + 1]}`, 'staircase',
          { block, floor: f, posY: (FLOOR_Y[f] + FLOOR_Y[f + 1]) / 2 });
      }
    });

    // Room nodes
    campusData.floors.forEach((floor, fi) => {
      floor.rooms.forEach(room => {
        if (nodes.has(room.id)) return;
        const block = getRoomBlock(room.id, room.x, room.z);
        addNode(room.id, room.name, 'room',
          { block, floor: fi, status: room.status || 'SECURE', rx: room.x, rz: room.z });
        if (room.status === 'MAINTENANCE') hazards.add(room.id);
      });
    });

    // ── Physical East-to-West Main Campus Street Topology ──────────────────
    addEdge('road_pg_front',      'road_b_front',       W.ROAD_S);
    addEdge('road_b_front',       'road_a_front',       W.ROAD_S);
    addEdge('road_a_front',       'road_e_front',       W.ROAD_S);
    addEdge('road_e_front',       'road_canteen_front', W.ROAD_S);
    addEdge('road_canteen_front', 'road_open_ground',   W.ROAD_M);
    addEdge('road_open_ground',   'vnr_circle',         W.ROAD_M);
    addEdge('vnr_circle',         'road_peb_front',     W.ROAD_S);
    addEdge('road_peb_front',     'main_gate',          W.ROAD_S);

    // Entrances → corresponding road junctions
    addEdge('pg_entrance', 'road_pg_front',      W.ROAD_S);
    addEdge('b_entrance',  'road_b_front',       W.ROAD_S);
    addEdge('b_east_exit', 'road_b_front',       W.ROAD_S);
    addEdge('b_east_exit', 'road_pg_front',      W.ROAD_S);
    addEdge('a_entrance',  'road_a_front',       W.ROAD_S);
    addEdge('c_entrance',  'road_b_front',       W.ROAD_S);
    addEdge('e_entrance',  'road_e_front',       W.ROAD_S);
    addEdge('d_entrance',  'road_d_front',       W.ROAD_S);
    addEdge('road_d_front','road_pg_front',      W.ROAD_S);
    addEdge('canteen',     'road_canteen_front', W.ROAD_S);
    addEdge('jsk_greens',  'road_d_front',       W.ROAD_S);

    // Entrance ↔ ground floor hub
    BLOCKS.forEach(block => {
      const k = BLOCK_KEY[block];
      addEdge(`${k}_entrance`, `${k}_f0`, W.ENT_HUB);
    });

    // Staircase segment edges (MAIN B-Block staircases only — in compound, closed by fire)
    BLOCKS.forEach(block => {
      const k = BLOCK_KEY[block];
      for (let f = 0; f < 4; f++) {
        const sid = `${k}_stair_${f}_${f + 1}`;
        addEdge(`${k}_f${f}`, sid,             W.STAIR_HALF);
        addEdge(sid,           `${k}_f${f + 1}`, W.STAIR_HALF);
      }
    });

    // ── East-Wing staircase edges (Lab 1-4 staircase — NOT in compound, stays open!) ──
    // Each floor: main B-Block hub  ↔ east-wing hub  (corridor crossover at same level)
    for (let f = 0; f < 5; f++) {
      addEdge(`b_f${f}`, `b_east_f${f}`, W.ENT_HUB); // east corridor crossover per floor
    }
    // East-wing staircase vertical connections
    for (let f = 0; f < 4; f++) {
      const sid = `b_east_stair_${f}_${f + 1}`;
      addEdge(`b_east_f${f}`, sid,              W.STAIR_HALF);
      addEdge(sid,            `b_east_f${f + 1}`, W.STAIR_HALF);
    }
    // East-wing ground floor → East Exit door → campus road
    addEdge('b_east_f0', 'b_east_exit', W.ENT_HUB);
    addEdge('b_east_exit', 'road_b_front', W.ROAD_S);
    addEdge('b_east_exit', 'road_pg_front', W.ROAD_S);

    // Inter-block skybridges / portals across all floors (Floor 1 through Floor 5)
    for (let f = 0; f < 5; f++) {
      addEdge(`b_f${f}`, `a_f${f}`, W.PORTAL_A);
      addEdge(`a_f${f}`, `c_f${f}`, W.PORTAL_ALT);
      addEdge(`c_f${f}`, `b_f${f}`, W.PORTAL_ALT);
    }

    addEdge('b_f2',  'pg_f2',  W.PORTAL_PG);
    addEdge('b_f3',  'pg_f3',  W.PORTAL_PG);
    addEdge('b_f4',  'pg_f4',  W.PORTAL_PG);
    addEdge('pg_f2', 'd_f2',   W.PORTAL_ALT);
    addEdge('pg_f3', 'd_f3',   W.PORTAL_ALT);
    addEdge('pg_f4', 'd_f4',   W.PORTAL_ALT);

    // Room ↔ floor hub edges
    campusData.floors.forEach((floor, fi) => {
      floor.rooms.forEach(room => {
        const node = nodes.get(room.id);
        if (!node || node.floor !== fi) return;
        const hubId = `${BLOCK_KEY[node.block]}_f${fi}`;
        if (!nodes.has(hubId)) return;
        const w = room.status === 'WARNING' ? W.ROOM_HUB * W.WARN_MULT : W.ROOM_HUB;
        addEdge(room.id, hubId, w);
      });
    });

    // Connect rooms on the East side of B-Block to the East-Wing hub on the SAME floor
    nodes.forEach((n, rid) => {
      if (n.type === 'room' && n.block === 'B-BLOCK' && n.rx !== undefined && n.rx > 20) {
        const ewHub = `b_east_f${n.floor}`;
        if (nodes.has(ewHub)) addEdge(rid, ewHub, W.ROOM_HUB);
      }
    });

    console.log(`[ROUTER v9.0] ${nodes.size} nodes · ${[...adj.values()].reduce((s, a) => s + a.length, 0) / 2} edges built.`);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  DIJKSTRA ROUTE FINDER
  // ══════════════════════════════════════════════════════════════════════════
  // Safety is ranked before travel distance. A route with less known risk is
  // preferred even when it is longer; distance only breaks a safety tie.
  function nodeRiskPenalty(id) {
    const node = nodes.get(id);
    if (!node) return 0;

    let penalty = node.status === 'WARNING' ? W.WARNING_RISK : 0;
    const neighbours = adj.get(id) || [];
    if (neighbours.some(({ to }) => hazards.has(to))) {
      penalty += W.HAZARD_BUFFER_RISK;
    }
    return penalty;
  }

  function safetyLevel(riskScore) {
    if (riskScore === 0) return 'LOW RISK';
    if (riskScore < W.HAZARD_BUFFER_RISK) return 'CAUTION';
    return 'ELEVATED RISK';
  }

  function dijkstra(startId, endId) {
    if (!nodes.has(startId) || !nodes.has(endId)) return null;
    if (hazards.has(startId) || hazards.has(endId)) return null;

    const score = new Map(), distance = new Map(), risk = new Map();
    const prev = new Map(), visited = new Set(), pq = new MinHeap();
    nodes.forEach((_, id) => {
      score.set(id, Infinity);
      distance.set(id, Infinity);
      risk.set(id, Infinity);
      prev.set(id, null);
    });

    const startRisk = nodeRiskPenalty(startId);
    score.set(startId, startRisk * W.SAFETY_PRIORITY);
    distance.set(startId, 0);
    risk.set(startId, startRisk);
    pq.push({ id: startId, d: score.get(startId) });

    while (pq.size > 0) {
      const { id: u, d } = pq.pop();
      if (visited.has(u)) continue;
      visited.add(u);
      if (u === endId) break;
      for (const { to: v, weight } of (adj.get(u) || [])) {
        if (visited.has(v) || hazards.has(v)) continue;
        const nextRisk = risk.get(u) + nodeRiskPenalty(v);
        const nextDistance = distance.get(u) + weight;
        const nextScore = nextRisk * W.SAFETY_PRIORITY + nextDistance;
        if (nextScore < score.get(v)) {
          score.set(v, nextScore);
          distance.set(v, nextDistance);
          risk.set(v, nextRisk);
          prev.set(v, u);
          pq.push({ id: v, d: nextScore });
        }
      }
    }

    if (!isFinite(score.get(endId))) return null;

    const path = []; let curr = endId;
    while (curr !== null) { path.unshift(curr); curr = prev.get(curr); }

    return {
      steps: path.map((id, i) => {
        const node = nodes.get(id);
        const nxt  = path[i + 1] || null;
        const segW = nxt ? ((adj.get(id) || []).find(e => e.to === nxt) || { weight: 0 }).weight : 0;
        return { id, node, segWeight: segW };
      }),
      totalDistance: Math.round(distance.get(endId)),
      riskScore: risk.get(endId),
      safetyLevel: safetyLevel(risk.get(endId))
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  3-D ROUTE TUBE  (Three.js)
  //  v9.0: Strict Orthogonal Grid Corridor Waypoint Generator
  // ══════════════════════════════════════════════════════════════════════════
  let _pathGroup = null, _outerMat = null, _animId = null, _animT = 0;

  function _stopAnim() {
    if (_animId) { cancelAnimationFrame(_animId); _animId = null; }
    _outerMat = null;
  }
  function _pulse() {
    _animT += 0.025;
    if (_outerMat) _outerMat.opacity = 0.06 + 0.10 * (0.5 + 0.5 * Math.sin(_animT));
    _animId = requestAnimationFrame(_pulse);
  }

  function clearRoutePath3D() {
    _stopAnim();
    const sc = window.scene || (typeof scene !== 'undefined' ? scene : null);
    try { if (sc && _pathGroup) sc.remove(_pathGroup); } catch (e) {}
    if (_pathGroup) {
      _pathGroup.traverse(c => { if (c.isMesh) { c.geometry.dispose(); c.material.dispose(); } });
    }
    _pathGroup = null;
  }

  function _isIndoor(n)  { return n && (n.type === 'floor_hub' || n.type === 'staircase' || n.type === 'room'); }
  function _isOutdoor(n) { return n && (n.type === 'road' || n.type === 'landmark'); }

  function buildCorridorWaypoints(steps) {
    const rawWaypoints = [];
    if (!steps || steps.length === 0) return rawWaypoints;

    for (let i = 0; i < steps.length; i++) {
      const curr = steps[i];
      const pCurr = getNodePos(curr.id);
      if (!pCurr) continue;

      const nxt = steps[i + 1] || null;
      const pNxt = nxt ? getNodePos(nxt.id) : null;

      rawWaypoints.push(new THREE.Vector3(pCurr.x, pCurr.y, pCurr.z));

      if (nxt && pNxt) {
        const fy = pCurr.y;

        // 1. Room → Floor Hub (Exit room into hallway corridor line z = -20 or 12.5 first)
        if (curr.node.type === 'room' && nxt.node.type === 'floor_hub') {
          const hallZ = pCurr.z < 0 ? -20.0 : (pCurr.z > 25 ? 40.0 : 12.5);
          rawWaypoints.push(new THREE.Vector3(pCurr.x, fy, hallZ));
          const targetX = (nxt.id.startsWith('b_') && pCurr.x > 20) ? 39.5 : pNxt.x;
          rawWaypoints.push(new THREE.Vector3(targetX, fy, hallZ));
        }

        // 2. Floor Hub → Room
        else if (curr.node.type === 'floor_hub' && nxt.node.type === 'room') {
          const hallZ = pNxt.z < 0 ? -20.0 : (pNxt.z > 25 ? 40.0 : 12.5);
          const startX = (curr.id.startsWith('b_') && pNxt.x > 20) ? 39.5 : pCurr.x;
          rawWaypoints.push(new THREE.Vector3(startX, fy, hallZ));
          rawWaypoints.push(new THREE.Vector3(pNxt.x, fy, hallZ));
        }

        // 3a. B-Block ↔ C-Block / A-Block Hub Cross-Corridor (Central Corridor at z=12.5)
        else if ((curr.id.startsWith('b_f') || curr.id.startsWith('c_f') || curr.id.startsWith('a_f')) &&
                 (nxt.id.startsWith('b_f') || nxt.id.startsWith('c_f') || nxt.id.startsWith('a_f')) &&
                 curr.node.block !== nxt.node.block) {
          rawWaypoints.push(new THREE.Vector3(pCurr.x, fy, 12.5));
          rawWaypoints.push(new THREE.Vector3(pNxt.x, fy, 12.5));
        }

        // 3b. B-Block Hub ↔ PG-Block Hub (Upper Floor Skybridge Portal at z=40)
        else if ((curr.id.startsWith('b_f') && nxt.id.startsWith('pg_f')) ||
                 (curr.id.startsWith('pg_f') && nxt.id.startsWith('b_f'))) {
          // B-Block Corridor North along x=7.5 to North corridor z=40
          rawWaypoints.push(new THREE.Vector3(7.5, fy, 40.0));
          // West along North Corridor to West Skybridge Door (x=-20.0)
          rawWaypoints.push(new THREE.Vector3(-20.0, fy, 40.0));
          // Across Skybridge to PG-Block (x=89.0, z=40.0)
          rawWaypoints.push(new THREE.Vector3(89.0, fy, 40.0));
          // Turn into PG Main Corridor (x=95.0, z=40.0)
          rawWaypoints.push(new THREE.Vector3(95.0, fy, 40.0));
        }

        // 4. PG-Block Hub ↔ D-Block Hub (Skybridge along x=95)
        else if ((curr.id.startsWith('pg_f') && nxt.id.startsWith('d_f')) ||
                 (curr.id.startsWith('d_f') && nxt.id.startsWith('pg_f'))) {
          rawWaypoints.push(new THREE.Vector3(95.0, fy, 19.5));
          rawWaypoints.push(new THREE.Vector3(95.0, fy, -72.5));
        }

        // 5. Indoor → Outdoor transition (Building Hub → Block Entrance → Main Street)
        else if (_isIndoor(curr.node) && _isOutdoor(nxt.node) && curr.node.block) {
          const ent = ENT_POS[curr.node.block];
          if (ent) {
            rawWaypoints.push(new THREE.Vector3(ent.x, ent.y, ent.z));
            rawWaypoints.push(new THREE.Vector3(ent.x, 0.3, -38.0));
          }
        }

        // 6. Outdoor → Indoor transition (Main Street → Block Entrance → Building Hub)
        else if (_isOutdoor(curr.node) && _isIndoor(nxt.node) && nxt.node.block) {
          const ent = ENT_POS[nxt.node.block];
          if (ent) {
            rawWaypoints.push(new THREE.Vector3(ent.x, 0.3, -38.0));
            rawWaypoints.push(new THREE.Vector3(ent.x, ent.y, ent.z));
          }
        }
      }
    }

    // Pass 2: Strict Orthogonal Enforcement for any remaining diagonal legs
    const finalWaypoints = [];
    for (let j = 0; j < rawWaypoints.length; j++) {
      const p1 = rawWaypoints[j];
      finalWaypoints.push(p1.clone());

      if (j < rawWaypoints.length - 1) {
        const p2 = rawWaypoints[j + 1];
        // If both X and Z differ on same floor (diagonal movement), insert L-shaped corner
        if (Math.abs(p1.y - p2.y) < 0.5 && Math.abs(p1.x - p2.x) > 0.5 && Math.abs(p1.z - p2.z) > 0.5) {
          let cornerZ = p2.z;
          if (p1.z > 25 || p2.z > 25) cornerZ = 40.0;
          else if (p1.z < -25 || p2.z < -25) cornerZ = -38.0;
          else if (p1.z < -10 || p2.z < -10) cornerZ = -20.0;
          else cornerZ = 12.5;

          finalWaypoints.push(new THREE.Vector3(p1.x, p1.y, cornerZ));
          finalWaypoints.push(new THREE.Vector3(p2.x, p1.y, cornerZ));
        }
      }
    }

    // Filter duplicate consecutive waypoints
    const filtered = [];
    finalWaypoints.forEach(pt => {
      if (filtered.length === 0) { filtered.push(pt); return; }
      const prev = filtered[filtered.length - 1];
      if (Math.abs(prev.x - pt.x) > 0.05 || Math.abs(prev.y - pt.y) > 0.05 || Math.abs(prev.z - pt.z) > 0.05) {
        filtered.push(pt);
      }
    });

    return filtered;
  }

  function drawRoutePath3D(steps) {
    clearRoutePath3D();
    const sc = window.scene || (typeof scene !== 'undefined' ? scene : null);
    if (!sc || typeof THREE === 'undefined') return;

    const waypoints = buildCorridorWaypoints(steps);
    if (waypoints.length < 2) return;

    // Slight elevation boost (+0.6) so rendered tubes float clearly above floors
    const pts = waypoints.map(pt => new THREE.Vector3(pt.x, pt.y + 0.6, pt.z));

    const curve = new THREE.CurvePath();
    for (let i = 0; i < pts.length - 1; i += 1) {
      curve.add(new THREE.LineCurve3(pts[i], pts[i + 1]));
    }

    _pathGroup = new THREE.Group();
    _pathGroup.name = 'ROUTE_PATH';
    _pathGroup.renderOrder = 99999;

    const segs = Math.max(pts.length * 16, 64);

    // 1. Sleek Glowing Solid Inner Navigation Pipe (Radius: 1.0 unit, depthTest: false)
    const iGeom = new THREE.TubeGeometry(curve, segs, 1.0, 12, false);
    const iMat  = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.98,
      depthTest: false,
      depthWrite: false
    });
    const tubeMesh = new THREE.Mesh(iGeom, iMat);
    tubeMesh.renderOrder = 99999;
    _pathGroup.add(tubeMesh);

    // 2. Neon Outer Aura Sleeve (Radius: 1.8 units, DoubleSide)
    const oGeom = new THREE.TubeGeometry(curve, segs, 1.8, 12, false);
    _outerMat   = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.30,
      side: THREE.DoubleSide,
      depthTest: false,
      depthWrite: false
    });
    const auraMesh = new THREE.Mesh(oGeom, _outerMat);
    auraMesh.renderOrder = 99998;
    _pathGroup.add(auraMesh);

    // 3. Crisp 3D Line Overlay (Linewidth: 3)
    const lineGeom = new THREE.BufferGeometry().setFromPoints(pts);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      linewidth: 3,
      depthTest: false,
      depthWrite: false
    });
    const lineMesh = new THREE.Line(lineGeom, lineMat);
    lineMesh.renderOrder = 100000;
    _pathGroup.add(lineMesh);

    // 4. Sleek Waypoint Marker Spheres & Floating Beacon Pins
    steps.forEach((step, i) => {
      const p = getNodePos(step.id); if (!p) return;
      const isFirst  = i === 0, isLast = i === steps.length - 1;
      const isStair  = step.node.type === 'staircase';
      const isPortal = step.node.type === 'floor_hub' && i > 0
        && steps[i - 1].node.type === 'floor_hub'
        && steps[i - 1].node.block !== step.node.block;

      const col = isFirst ? 0x00ff66 : isLast ? 0xff2244 : isStair ? 0xffaa00 : isPortal ? 0xbd00ff : 0x00ffff;
      const r   = (isFirst || isLast) ? 2.5 : isStair ? 1.8 : 1.2;

      // Waypoint Sphere
      const sg  = new THREE.SphereGeometry(r, 16, 16);
      const sm  = new THREE.MeshBasicMaterial({
        color: col,
        transparent: true,
        opacity: 0.95,
        depthTest: false,
        depthWrite: false
      });
      const sp  = new THREE.Mesh(sg, sm);
      sp.position.set(p.x, p.y + 0.6, p.z);
      sp.renderOrder = 100000;
      _pathGroup.add(sp);

      // Start / Destination Floating 3D Beacon Pillars & Halo Rings
      if (isFirst || isLast) {
        // Floating Halo Ring
        const hg = new THREE.SphereGeometry(r * 1.8, 16, 16);
        const hm = new THREE.MeshBasicMaterial({
          color: col,
          transparent: true,
          opacity: 0.25,
          depthTest: false,
          depthWrite: false
        });
        const ha = new THREE.Mesh(hg, hm);
        ha.position.set(p.x, p.y + 0.6, p.z);
        ha.renderOrder = 99997;
        _pathGroup.add(ha);

        // Vertical Floating Beacon Line (Pillar) pointing to sky (Linewidth: 3)
        const pillarPts = [
          new THREE.Vector3(p.x, p.y, p.z),
          new THREE.Vector3(p.x, p.y + 25, p.z)
        ];
        const pillarGeom = new THREE.BufferGeometry().setFromPoints(pillarPts);
        const pillarMat = new THREE.LineBasicMaterial({
          color: col,
          linewidth: 3,
          depthTest: false,
          depthWrite: false
        });
        const pillarMesh = new THREE.Line(pillarGeom, pillarMat);
        pillarMesh.renderOrder = 100000;
        _pathGroup.add(pillarMesh);

        // Top Floating Beacon Sphere
        const topSg = new THREE.SphereGeometry(2.2, 16, 16);
        const topSm = new THREE.MeshBasicMaterial({
          color: col,
          transparent: true,
          opacity: 0.95,
          depthTest: false,
          depthWrite: false
        });
        const topSp = new THREE.Mesh(topSg, topSm);
        topSp.position.set(p.x, p.y + 25, p.z);
        topSp.renderOrder = 100000;
        _pathGroup.add(topSp);
      }
    });


    sc.add(_pathGroup);

    // Auto-center camera target to midpoint of route
    try {
      const ctrl = window.controls || (typeof controls !== 'undefined' ? controls : null);
      if (ctrl && pts.length > 0) {
        const midPt = pts[Math.floor(pts.length / 2)];
        ctrl.target.set(midPt.x, midPt.y, midPt.z);
        ctrl.update();
      }
    } catch (e) {}

    _animT = 0; _pulse();
  }


  // ══════════════════════════════════════════════════════════════════════════
  //  ROUTE RENDERER (sidebar UI)
  // ══════════════════════════════════════════════════════════════════════════
  const TYPE_ICON  = { landmark:'🏁', road:'🛣️', entrance:'🚪', floor_hub:'🔀', staircase:'🪜', room:'📍' };
  const TYPE_COLOR = { landmark:'#00e676', road:'#94a3b8', entrance:'#00f0ff', floor_hub:'#bd00ff', staircase:'#ff9e00', room:'#00f0ff' };

  function metaLabel(n) {
    if (n.type === 'staircase') return 'Staircase Segment';
    if (n.type === 'floor_hub') return 'Corridor Hub';
    if (n.type === 'entrance')  return 'Block Entrance';
    if (n.type === 'road')      return 'Campus Road';
    if (n.type === 'landmark')  return 'Outdoor / Landmark';
    const fl = n.floor !== undefined ? ` · ${FLR_LBL[n.floor]}` : '';
    return `${n.block || ''}${fl}`;
  }

  function renderRoute(result) {
    const el = document.getElementById('route-result'); if (!el) return;
    el.classList.remove('hidden');
    const panel = document.getElementById('route-panel');
    if (panel) panel.classList.remove('hidden');
    if (!result) {
      el.innerHTML = `<div class="route-no-path"><i class="fa-solid fa-ban"></i>
        <div><strong>NO ROUTE FOUND</strong>
        <p>All escape paths are blocked.<br>Remove hazards or choose different nodes.</p></div></div>`;
      clearRoutePath3D(); return;
    }
    const { steps, totalDistance, riskScore = 0, safetyLevel: routeSafety = 'LOW RISK' } = result;
    let html = `<div class="route-summary">
      <div class="route-summary-left"><span class="rs-dist">${totalDistance}</span><span class="rs-unit">units</span></div>
      <div class="route-summary-right"><span class="rs-stops">${routeSafety} · ${steps.length} stops</span><span class="rs-mode">SAFEST DIJKSTRA PATH · RISK ${riskScore}</span></div>
    </div><div class="route-steps">`;
    steps.forEach((step, i) => {
      const isLast  = i === steps.length - 1;
      const isWarn  = step.node.status === 'WARNING';
      const isMaint = step.node.status === 'MAINTENANCE';
      const isStair = step.node.type === 'staircase';
      const cls = hazards.has(step.id) ? 'step-blocked' : isWarn ? 'step-warning' : isMaint ? 'step-maint' : isStair ? 'step-stair' : '';
      const dotC = TYPE_COLOR[step.node.type] || '#00f0ff';
      html += `<div class="route-step ${cls}">
        <div class="step-left">
          <div class="step-dot" style="background:${dotC};box-shadow:0 0 6px ${dotC}88"></div>
          ${!isLast ? '<div class="step-line"></div>' : ''}
        </div>
        <div class="step-right">
          <span class="step-icon">${TYPE_ICON[step.node.type] || '📍'}</span>
          <div class="step-info">
            <span class="step-name">${step.node.name}</span>
            <span class="step-meta">${metaLabel(step.node)}</span>
          </div>
          ${isWarn  ? '<span class="step-badge warn">⚠ ALERT</span>'  : ''}
          ${isMaint ? '<span class="step-badge maint">🔧 MAINT</span>' : ''}
          ${isStair ? '<span class="step-badge stair">🪜 STAIR</span>' : ''}
        </div>
      </div>${!isLast ? `<div class="step-seg-dist"><span>${step.segWeight}u</span></div>` : ''}`;
    });
    html += `</div>`;
    el.innerHTML = html;
    drawRoutePath3D(steps);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  DROPDOWN BUILDER
  // ══════════════════════════════════════════════════════════════════════════
  function populateSelect(selEl, includeCompound = false) {
    selEl.innerHTML = '';
    if (includeCompound) {
      const cg = document.createElement('optgroup');
      cg.label = '── 🔥 FIRE — FULL BLOCK STAIRCASE CLOSURE ──';
      BLOCKS.forEach(block => {
        const k = BLOCK_KEY[block];
        const o = document.createElement('option');
        o.value = `COMPOUND_STAIRS_${k}`;
        o.textContent = `🔥 ${block} — All Staircases (Fire)`;
        cg.appendChild(o);
      });
      selEl.appendChild(cg);
    }

    const lmGrp = document.createElement('optgroup');
    lmGrp.label = '── OUTDOOR / CAMPUS ROADS ──';
    ['main_gate','vnr_circle','canteen','jsk_greens',
     'road_pg_front','road_b_front','road_a_front','road_e_front','road_canteen_front','road_open_ground','road_peb_front']
    .forEach(id => {
      if (!nodes.has(id)) return;
      const n = nodes.get(id), o = document.createElement('option');
      o.value = id; o.textContent = n.name; lmGrp.appendChild(o);
    });
    if (lmGrp.children.length) selEl.appendChild(lmGrp);

    BLOCKS.forEach(block => {
      const k = BLOCK_KEY[block];
      const bGrp = document.createElement('optgroup');
      bGrp.label = `── ${block} ──`;
      const entNodes = [];
      nodes.forEach((n, id) => {
        if (n.type === 'entrance' && n.block === block) entNodes.push(id);
      });
      [...entNodes, ...Array.from({ length: 5 }, (_, f) => `${k}_f${f}`)].forEach(id => {
        if (!nodes.has(id)) return;
        const n = nodes.get(id), o = document.createElement('option');
        o.value = id; o.textContent = n.name; bGrp.appendChild(o);
      });
      const sh = document.createElement('option'); sh.disabled = true; sh.textContent = '  ── Staircases ──';
      bGrp.appendChild(sh);
      for (let f = 0; f < 4; f++) {
        const sid = `${k}_stair_${f}_${f + 1}`; if (!nodes.has(sid)) continue;
        const n = nodes.get(sid), o = document.createElement('option');
        o.value = sid; o.textContent = `  🪜 ${n.name}`; bGrp.appendChild(o);
      }
      // East-Wing section for B-BLOCK
      if (k === 'b') {
        const ewh = document.createElement('option'); ewh.disabled = true;
        ewh.textContent = '  ── East-Wing (Lab 1-4 Staircase) ──'; bGrp.appendChild(ewh);
        for (let f = 0; f < 5; f++) {
          const eid = `b_east_f${f}`; if (!nodes.has(eid)) continue;
          const n = nodes.get(eid), o = document.createElement('option');
          o.value = eid; o.textContent = `  🏢 ${n.name}`; bGrp.appendChild(o);
        }
        for (let f = 0; f < 4; f++) {
          const sid = `b_east_stair_${f}_${f + 1}`; if (!nodes.has(sid)) continue;
          const n = nodes.get(sid), o = document.createElement('option');
          o.value = sid; o.textContent = `  🪜 ${n.name}`; bGrp.appendChild(o);
        }
      }
      for (let f = 0; f < 5; f++) {
        const fl = [];
        nodes.forEach((n, id) => { if (n.type === 'room' && n.block === block && n.floor === f) fl.push({ id, n }); });
        if (!fl.length) continue;
        const fh = document.createElement('option'); fh.disabled = true;
        fh.textContent = `  ── ${FLR_LBL[f]} Rooms ──`; bGrp.appendChild(fh);
        fl.sort((a, b) => a.n.name.localeCompare(b.n.name)).forEach(({ id, n }) => {
          const o = document.createElement('option');
          o.value = id;
          o.textContent = `  ${n.name}${n.status === 'MAINTENANCE' ? ' [MAINT]' : n.status === 'WARNING' ? ' ⚠' : ''}`;
          bGrp.appendChild(o);
        });
      }
      if (bGrp.children.length) selEl.appendChild(bGrp);
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  UI WIRING
  // ══════════════════════════════════════════════════════════════════════════
  function makeHazardTag(id, label, hazardList, removeIds) {
    const tag = document.createElement('div');
    tag.className = 'hazard-tag';
    tag.innerHTML = `<span>⚠ ${label}</span><button class="hz-rm" title="Remove">✕</button>`;
    tag.querySelector('.hz-rm').addEventListener('click', () => {
      (removeIds || [id]).forEach(sid => hazards.delete(sid));
      tag.remove();
      const fromSel = document.getElementById('route-from');
      const toSel   = document.getElementById('route-to');
      if (fromSel && toSel && fromSel.value && toSel.value) {
        renderRoute(dijkstra(fromSel.value, toSel.value));
      }
    });
    hazardList.appendChild(tag);
  }

  function setupUI() {
    const fromSel     = document.getElementById('route-from');
    const toSel       = document.getElementById('route-to');
    const hazardSel   = document.getElementById('hazard-node-select');
    const hazardList  = document.getElementById('hazard-list');
    const findBtn     = document.getElementById('btn-find-route');
    const swapBtn     = document.getElementById('btn-swap-route');
    const addHazBtn   = document.getElementById('btn-add-hazard');
    const clearHazBtn = document.getElementById('btn-clear-hazards');
    const resultEl    = document.getElementById('route-result');
    const toggleBtn   = document.getElementById('btn-toggle-router');
    const routerBody  = document.getElementById('route-finder-body');
    const clearPathBtn= document.getElementById('btn-clear-path');

    if (!fromSel || !toSel || !findBtn) return;

    populateSelect(fromSel);
    populateSelect(toSel);
    if (hazardSel) populateSelect(hazardSel, true);

    fromSel.value = nodes.has('b_f4') ? 'b_f4' : 'main_gate';
    toSel.value   = 'main_gate';

    if (toggleBtn && routerBody) {
      toggleBtn.addEventListener('click', () => {
        const c = routerBody.classList.toggle('rf-collapsed');
        toggleBtn.querySelector('i').className = c ? 'fa-solid fa-chevron-down' : 'fa-solid fa-chevron-up';
      });
    }
    if (swapBtn) swapBtn.addEventListener('click', () => {
      const t = fromSel.value; fromSel.value = toSel.value; toSel.value = t;
      if (fromSel.value && toSel.value && resultEl && !resultEl.classList.contains('hidden')) {
        renderRoute(dijkstra(fromSel.value, toSel.value));
      }
    });

    function addSelectedHazard() {
      if (!hazardSel) return;
      const id = hazardSel.value; if (!id) return;
      if (COMPOUND[id]) {
        const ids = COMPOUND[id];
        let alreadyAdded = ids.every(sid => hazards.has(sid));
        if (!alreadyAdded) {
          ids.forEach(sid => hazards.add(sid));
          const bName = id.replace('COMPOUND_STAIRS_', '').toUpperCase();
          makeHazardTag(id, `🔥 ${bName}-BLOCK All Staircases`, hazardList, ids);
        }
        hazardSel.value = '';
        return;
      }
      if (!nodes.has(id) || hazards.has(id)) { hazardSel.value = ''; return; }
      hazards.add(id);
      makeHazardTag(id, nodes.get(id).name, hazardList, null);
      hazardSel.value = '';
    }

    if (hazardSel) {
      hazardSel.addEventListener('change', () => {
        addSelectedHazard();
        if (fromSel.value && toSel.value && resultEl && !resultEl.classList.contains('hidden')) {
          renderRoute(dijkstra(fromSel.value, toSel.value));
        }
      });
    }

    if (addHazBtn) {
      addHazBtn.addEventListener('click', e => {
        e.stopPropagation();
        addSelectedHazard();
        if (fromSel.value && toSel.value && resultEl && !resultEl.classList.contains('hidden')) {
          renderRoute(dijkstra(fromSel.value, toSel.value));
        }
      });
    }

    if (clearHazBtn) {
      clearHazBtn.addEventListener('click', e => {
        e.stopPropagation();
        hazards.clear();
        nodes.forEach((n, id) => { if (n.status === 'MAINTENANCE') hazards.add(id); });
        if (hazardList) hazardList.innerHTML = '';
        if (hazardSel) hazardSel.value = '';
        clearRoutePath3D();
        if (resultEl && fromSel.value && toSel.value) {
          renderRoute(dijkstra(fromSel.value, toSel.value));
        }
      });
    }

    if (clearPathBtn) clearPathBtn.addEventListener('click', () => {
      clearRoutePath3D();
      if (resultEl) { resultEl.classList.add('hidden'); resultEl.innerHTML = ''; }
    });

    findBtn.addEventListener('click', e => {
      e.stopPropagation();
      addSelectedHazard();
      const start = fromSel.value, end = toSel.value;
      if (!resultEl) return;
      if (!start || !end || start === end) {
        resultEl.classList.remove('hidden');
        resultEl.innerHTML = `<div class="route-no-path"><i class="fa-solid fa-circle-info"></i>
          <div><strong>SELECT TWO DIFFERENT NODES</strong><p>Pick a FROM and a TO node.</p></div></div>`;
        return;
      }
      renderRoute(dijkstra(start, end));
    });

    // ── ESP32 Hardware Serial UI Wiring ──────────────────────────────────────
    const hwHeaderBtn  = document.getElementById('btn-hardware-serial-header');
    const hwConnectBtn = document.getElementById('btn-connect-serial');
    const hwSimBtn     = document.getElementById('btn-simulate-fire');
    const modalBtnYes  = document.getElementById('modal-btn-yes');
    const modalBtnNo   = document.getElementById('modal-btn-no');

    if (hwHeaderBtn)  hwHeaderBtn.addEventListener('click', connectHardwareSerial);
    if (hwConnectBtn) hwConnectBtn.addEventListener('click', connectHardwareSerial);
    if (hwSimBtn)     hwSimBtn.addEventListener('click', triggerSimulatedFire);
    if (modalBtnYes)  modalBtnYes.addEventListener('click', executeBBlockClosureAndReroute);
    if (modalBtnNo)   modalBtnNo.addEventListener('click', closeFireModal);

    console.log('[ROUTER v9.0] UI ready with ESP32 Hardware Serial & Emergency Fire Re-routing.');
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  ESP32 ARDUINO HARDWARE SERIAL & EMERGENCY RE-ROUTING MODULE
  // ══════════════════════════════════════════════════════════════════════════
  let serialPort = null;
  let serialReader = null;

  function updateSerialUI(isConnected, statusText, isFireAlert = false) {
    const dot = document.getElementById('hw-status-dot');
    const txt = document.getElementById('hw-status-text');
    const headerBtn = document.getElementById('btn-hardware-serial-header');
    const connectBtn = document.getElementById('btn-connect-serial');

    if (dot) {
      dot.className = `hw-status-dot ${isFireAlert ? 'fire' : isConnected ? 'connected' : 'disconnected'}`;
    }
    if (txt) {
      txt.textContent = statusText;
      txt.style.color = isFireAlert ? '#ff2828' : isConnected ? '#00ff88' : '#94a3b8';
    }
    if (headerBtn) {
      headerBtn.className = `hardware-header-btn ${isFireAlert ? 'alert' : isConnected ? 'connected' : ''}`;
      headerBtn.innerHTML = isFireAlert
        ? '<i class="fa-solid fa-fire-flame-curved pulse-icon"></i> FIRE DETECTED'
        : isConnected
        ? '<i class="fa-solid fa-microchip"></i> ESP32 CONNECTED'
        : '<i class="fa-solid fa-microchip"></i> ESP32 HARDWARE';
    }
    if (connectBtn) {
      connectBtn.innerHTML = isConnected
        ? '<i class="fa-solid fa-plug-circle-check"></i> DISCONNECT'
        : '<i class="fa-solid fa-plug"></i> CONNECT ESP32';
    }
  }

  function updateSerialLogPreview(logLine) {
    const logEl = document.getElementById('hw-log-preview');
    if (logEl) {
      logEl.textContent = `[SERIAL LOG] ${logLine}`;
      logEl.style.color = logLine.toLowerCase().includes('fire') ? '#ff4444' : '#38bdf8';
    }
  }

  async function stopSerialReader() {
    if (serialReader) {
      try { await serialReader.cancel(); } catch (e) {}
      try { serialReader.releaseLock(); } catch (e) {}
      serialReader = null;
    }
    if (serialPort) {
      try { await serialPort.close(); } catch (e) {}
      serialPort = null;
    }
  }

  async function connectHardwareSerial() {
    if (serialPort || serialReader) {
      await stopSerialReader();
      updateSerialUI(false, 'SERIAL: DISCONNECTED');
      updateSerialLogPreview('Serial connection closed.');
      return;
    }

    if (!('serial' in navigator)) {
      alert('Web Serial API is not supported in this browser. Please use Chrome, Edge, or Opera.');
      return;
    }

    try {
      serialPort = await navigator.serial.requestPort();
      await serialPort.open({ baudRate: 115200 });
      updateSerialUI(true, 'ESP32 CONNECTED // LISTENING...');
      updateSerialLogPreview('Connection established. Reading serial stream...');

      const textDecoder = new TextDecoderStream();
      const readableStreamClosed = serialPort.readable.pipeTo(textDecoder.writable);
      serialReader = textDecoder.readable.getReader();

      readSerialLoop();
    } catch (err) {
      console.error('[HARDWARE SERIAL] Port selection error:', err);
      updateSerialUI(false, 'SERIAL: DISCONNECTED / ERROR');
    }
  }

  async function readSerialLoop() {
    let logBuffer = '';
    try {
      while (serialReader) {
        const { value, done } = await serialReader.read();
        if (done) break;
        if (value) {
          logBuffer += value;
          const lines = logBuffer.split('\n');
          logBuffer = lines.pop() || '';
          for (const line of lines) {
            const cleanLine = line.trim();
            if (!cleanLine) continue;
            updateSerialLogPreview(cleanLine);
            if (cleanLine.toLowerCase().includes('fire detected')) {
              // "so once it says fire detected thats when the serial logs stop in ardiuino"
              await stopSerialReader();
              updateSerialUI(false, 'FIRE DETECTED // LOGS STOPPED', true);
              triggerFireEmergencyAlert();
              return;
            }
          }
        }
      }
    } catch (e) {
      console.warn('[HARDWARE SERIAL] Read loop ended:', e);
    }
  }

  function triggerSimulatedFire() {
    updateSerialLogPreview('FIRE DETECTED');
    updateSerialUI(false, 'FIRE DETECTED // LOGS STOPPED', true);
    triggerFireEmergencyAlert();
  }

  function triggerFireEmergencyAlert() {
    const modal = document.getElementById('hardware-alert-modal');
    if (modal) modal.classList.remove('hidden');
  }

  function closeFireModal() {
    const modal = document.getElementById('hardware-alert-modal');
    if (modal) modal.classList.add('hidden');
  }

  // ── EVACUATION PRIORITY CHAIN ──────────────────────────────────────────────
  //  PRIORITY 1: B-Block Staircases & B Exit (when no fire in B)
  //  PRIORITY 2: C-Block Corridor & Staircases (when B staircases blocked)
  //  PRIORITY 3: PG-Block Floor 5 Skybridge (when both B & C staircases blocked)
  // ─────────────────────────────────────────────────────────────────────────────
  function executeBBlockClosureAndReroute() {
    closeFireModal();

    const hazardList = document.getElementById('hazard-list');
    const fromSel    = document.getElementById('route-from');
    const toSel      = document.getElementById('route-to');
    const routeResultEl = document.getElementById('route-result');

    // ── STEP 1: Block ALL B-Block staircases & ground exits ──────────────────
    const bStairsId   = 'COMPOUND_STAIRS_b';
    const bStairNodes = COMPOUND[bStairsId] || [];
    const alreadyAdded = bStairNodes.every(sid => hazards.has(sid));
    if (!alreadyAdded) {
      bStairNodes.forEach(sid => hazards.add(sid));
      if (hazardList) {
        makeHazardTag(bStairsId, '🔥 B-BLOCK All Staircases & Exits', hazardList, bStairNodes);
      }
    }

    // ── STEP 2: Force starting node to B-Block Floor 5 hub ────────────────────
    if (fromSel) fromSel.value = 'b_f4';
    if (toSel)   toSel.value   = 'main_gate';

    const startNode = 'b_f4';
    const destNode  = 'main_gate';

    // ── TIER 1 / PRIORITY 2: Route via A-Block Staircases ─────────────────────
    const primaryRoute = dijkstra(startNode, destNode);
    if (primaryRoute) {
      renderRoute(primaryRoute);
      if (routeResultEl) {
        const usesABlock   = primaryRoute.steps.some(s => s.id.startsWith('a_'));
        const usesEastExit = primaryRoute.steps.some(s => s.id === 'b_east_exit');
        const titleText    = usesABlock
          ? 'TIER 1 EXIT — A-BLOCK STAIRCASES'
          : usesEastExit
          ? 'TIER 1 EXIT — B-BLOCK EAST EXIT'
          : 'TIER 1 EMERGENCY EVACUATION ROUTE';
        const descText     = usesABlock
          ? 'B-Block staircases closed. Evacuating via <strong>A-Block Corridor &amp; Staircases</strong> to campus road.'
          : 'B-Block main staircases closed. Evacuating via <strong>East Exit</strong> to campus road.';
        const banner       = document.createElement('div');
        banner.className   = 'evac-banner tier1';
        banner.innerHTML   = `
          <div class="evac-badge"><i class="fa-solid fa-door-open"></i> ${titleText}</div>
          <p class="evac-desc">${descText}</p>`;
        routeResultEl.prepend(banner);
      }
      return;
    }

    // ── TIER 2 / PRIORITY 3: A-Block also blocked — Reroute via PG Skybridge ───
    const aStairsId   = 'COMPOUND_STAIRS_a';
    const aStairNodes = COMPOUND[aStairsId] || [];
    const aAlreadyAdded = aStairNodes.every(sid => hazards.has(sid));
    if (!aAlreadyAdded) {
      aStairNodes.forEach(sid => hazards.add(sid));
      if (hazardList) {
        makeHazardTag(aStairsId, '🔥 A-BLOCK All Staircases (Auto-blocked)', hazardList, aStairNodes);
      }
    }

    const secondaryRoute = dijkstra(startNode, destNode);
    if (secondaryRoute) {
      renderRoute(secondaryRoute);
      if (routeResultEl) {
        const banner     = document.createElement('div');
        banner.className = 'evac-banner tier2';
        banner.innerHTML = `
          <div class="evac-badge tier2-badge"><i class="fa-solid fa-person-walking-arrow-right"></i> TIER 2 EXIT — PG-BLOCK SKYBRIDGE</div>
          <p class="evac-desc">B-Block &amp; A-Block staircases are blocked. Evacuating via <strong>Floor 5 Skybridge to PG-Block</strong> then PG entrance to campus road.</p>`;
        routeResultEl.prepend(banner);
      }
      return;
    }

    // ── TIER 3: All exits blocked — no path found ──────────────────────────────
    renderRoute(null);
    if (routeResultEl) {
      const banner     = document.createElement('div');
      banner.className = 'evac-banner tier3';
      banner.innerHTML = `
        <div class="evac-badge tier3-badge"><i class="fa-solid fa-triangle-exclamation"></i> ALL EXITS BLOCKED — NO ROUTE</div>
        <p class="evac-desc">B-Block, C-Block, and PG Skybridge exits are all blocked. Contact emergency services immediately.</p>`;
      routeResultEl.prepend(banner);
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  CHATBOT ROUTE PLANNER — natural-language start / end / fire hazards
  // ══════════════════════════════════════════════════════════════════════════
  function normalizeText(s) {
    return (s || '').toLowerCase().replace(/[/_]/g, '-').replace(/\s+/g, ' ').trim();
  }

  function resolveNode(query) {
    if (!query || nodes.size === 0) return null;
    const raw = query.trim();
    const q = normalizeText(raw);

    for (const id of [raw.toLowerCase(), q, q.replace(/\s/g, '-'), q.replace(/\s/g, '')]) {
      if (nodes.has(id)) return id;
    }

    const roomPatterns = [
      /\b(?:room\s*)?([a-z]{1,2})[- ]?(?:block\s*)?[- ]?(g?\d{2,4}[a-z]?)\b/i,
      /\b([a-z]{1,2})[- ]block[- ]?(?:room\s*)?([g]?\d{2,4}[a-z]?)\b/i,
    ];
    for (const re of roomPatterns) {
      const m = raw.match(re);
      if (m) {
        const id = `${m[1].toLowerCase()}-${m[2].toLowerCase()}`;
        if (nodes.has(id)) return id;
      }
    }

    const shortcuts = {
      'main gate': 'main_gate',
      maingate: 'main_gate',
      gate: 'main_gate',
      'vnr circle': 'vnr_circle',
      roundabout: 'vnr_circle',
      canteen: 'canteen',
      'jsk greens': 'jsk_greens',
      'open ground': 'road_open_ground',
    };
    for (const [key, id] of Object.entries(shortcuts)) {
      if (q.includes(key) && nodes.has(id)) return id;
    }

    const floorHub = q.match(/\b([a-z]{1,2})[- ]?block\b.*?(?:floor|flr|level)\s*(\d+|ground|1)/i);
    if (floorHub) {
      const fi = /ground|^1$/.test(floorHub[2]) ? 0 : parseInt(floorHub[2], 10) - 1;
      const id = `${floorHub[1].toLowerCase()}_f${Math.max(0, Math.min(4, fi))}`;
      if (nodes.has(id)) return id;
    }

    if (/(entrance|exit|door)/.test(q)) {
      const bm = q.match(/\b([a-z])[- ]?block\b/);
      if (bm) {
        const id = `${bm[1]}_entrance`;
        if (nodes.has(id)) return id;
        if (bm[1] === 'b' && nodes.has('b_east_exit')) return 'b_east_exit';
      }
    }

    let bestId = null;
    let bestScore = 0;
    nodes.forEach((n, id) => {
      const name = normalizeText(n.name);
      let score = 0;
      if (name === q) score = 100;
      else if (id === q.replace(/\s/g, '-')) score = 95;
      else if (name.includes(q) || q.includes(name)) score = 70 + Math.min(q.length, 20);
      else {
        const tokens = q.split(' ').filter(t => t.length > 2);
        score = tokens.filter(t => name.includes(t) || id.includes(t)).length * 18;
      }
      if (score > bestScore) {
        bestScore = score;
        bestId = id;
      }
    });
    return bestScore >= 36 ? bestId : null;
  }

  function resolveHazardSpec(text) {
    const q = normalizeText(text);
    for (const block of BLOCKS) {
      const k = BLOCK_KEY[block];
      const blockPat = new RegExp(`\\b${k}\\s*[- ]?block\\b|\\b${block.replace('-', '[- ]?')}\\b`, 'i');
      const hazardPat = /stair|staircase|stairs|fire|closed|blocked|hazard|burning|exit/;
      if (blockPat.test(q) && hazardPat.test(q)) {
        return {
          type: 'compound',
          id: `COMPOUND_STAIRS_${k}`,
          label: `🔥 ${block} All Staircases`,
          block,
        };
      }
    }
    const nodeId = resolveNode(text);
    if (nodeId) {
      return { type: 'node', id: nodeId, label: nodes.get(nodeId).name, block: nodes.get(nodeId).block || null };
    }
    return null;
  }

  // Extract room references independently of sentence grammar. This supports
  // compact IDs (PG410), spaced IDs (pg 410), hyphenated IDs (PG-410), and
  // block/room wording (PG Block Room 410).
  function findRoomMentions(message) {
    const mentions = [];
    const roomRe = /\b(?:room\s*)?(pg|[abcde])\s*(?:[-_ ]*(?:block)?\s*)?(?:room\s*)?[-_ ]*(g?\d{1,4}[a-z]?)\b/gi;
    let match;
    while ((match = roomRe.exec(message)) !== null) {
      const id = `${match[1].toLowerCase()}-${match[2].toLowerCase()}`;
      if (nodes.has(id) && !mentions.some(item => item.id === id && item.index === match.index)) {
        mentions.push({ id, index: match.index, text: match[0] });
      }
    }
    return mentions;
  }

  function parseRoutingRequest(message) {
    const routeIntent =
      /\b(route|reroute|path|navigate|evacuat|escape|direction|shortest|safest|find\s+(?:a\s+)?way|how\s+(?:do|can|should)\s+i\s+(?:get|go|reach))\b/i.test(message) ||
      (/\b(from|to|fire|hazard|staircase|closed|blocked)\b/i.test(message) &&
        /\b(main\s*gate|block|room|b-|c-|pg-|stair)\b/i.test(message));

    if (!routeIntent) return null;

    let fromText = null;
    let toText = null;
    const hazardTexts = [];

    const hazardPatterns = [
      /(?:fire|hazard|blocked|closed)\s+(?:at|in|on|near)\s+(.+?)(?:[,.]|$|\band\b|\bthen\b|\bto\b|\bfrom\b|\bi\s+need\b|\breach\b)/gi,
      /(.+?)\s+(?:staircase|stairs)\s+(?:is|are)\s+(?:closed|blocked|on fire)/gi,
      /where\s+(?:the\s+)?fire\s+(?:is\s+)?(?:situated|located|at|in)\s+(.+?)(?:[,.]|$|\band\b|\bthen\b)/gi,
      /(?:with|if)\s+(.+?\s+(?:staircase|stairs|block).*?)\s+(?:closed|blocked|on fire)/gi,
    ];
    for (const re of hazardPatterns) {
      let m;
      while ((m = re.exec(message)) !== null) {
        const chunk = m[1].trim();
        if (chunk && !hazardTexts.includes(chunk)) hazardTexts.push(chunk);
      }
    }

    const selfLocationPattern = /\b(?:i\s*(?:am|['’]m)|im)\s+(?:(?:at|in)\s+)?(.+?)\s*(?:,|\band\b|\bwith\b|\bfire\b|\bneed\b|\bwant\b|\bthen\b)/i;
    const fromToPatterns = [
      /(?:from|start(?:ing)?(?:\s+(?:at|from|node))?)\s*[:\-]?\s*(.+?)\s+(?:to|towards|until|reach(?:ing)?|go(?:ing)?\s+to|end(?:ing)?(?:\s+(?:at|in|node))?)\s*[:\-]?\s*(.+?)(?:[.!?]|$)/i,
      /start(?:ing)?\s+(?:node\s+)?(.+?)\s+end(?:ing)?\s+(?:node\s+)?(.+?)(?:[.!?]|$)/i,
      selfLocationPattern,
    ];

    for (const re of fromToPatterns) {
      const m = message.match(re);
      if (!m) continue;
      if (re === selfLocationPattern) {
        fromText = m[1].trim();
        const tail = message.slice(m.index + m[0].length);
        const toMatch = tail.match(/(?:need\s+to\s+|want\s+to\s+|reach|get\s+to|go\s+to|evacuate\s+to)\s+(.+?)(?:[.!?]|$)/i);
        if (toMatch) toText = toMatch[1].trim();
      } else {
        fromText = m[1].trim();
        toText = m[2].trim();
        toText = toText.replace(/(?:,|\bfire\b|\bhazard\b|\bwhere\b|\bwith\b).*$/i, '').trim();
      }
      break;
    }

    if (!toText) {
      const toMatch = message.match(/(?:reach|get\s+to|go\s+to|evacuate\s+to|take\s+me\s+to|guide\s+me\s+to|send\s+me\s+to|destination\s*(?:is|:)?)\s+(.+?)(?:[.!?]|$)/i);
      if (toMatch) toText = toMatch[1].trim();
    }

    // Flexible fallbacks for messages such as "currently PG410, guide me to
    // the main gate" or terse messages containing two room IDs.
    if (!fromText) {
      const originMatch = message.match(/\b(?:from|starting(?:\s+(?:at|from))?|currently\s+(?:at|in)?|my\s+location\s*(?:is|:))\s+(.+?)(?:,|\bto\b|\breach\b|\bget\b|\bgo\b|\bfire\b|\bhazard\b|$)/i);
      if (originMatch) fromText = originMatch[1].trim();
    }

    const roomMentions = findRoomMentions(message);
    if (!fromText && roomMentions.length) fromText = roomMentions[0].id;
    if (!toText && roomMentions.length > 1) toText = roomMentions[1].id;

    if (fromText) {
      fromText = fromText.replace(/^(?:from|start(?:ing)?(?:\s+(?:at|from))?\s*[:\-]?\s*)/i, '').trim();
      fromText = fromText.replace(/(?:,|\band\b|\bwith\b|\bwhere\b|\bfire\b|\bhazard\b).*$/i, '').trim();
    }
    if (toText) {
      toText = toText.replace(/(?:,|\band\b|\bwith\b|\bwhere\b|\bfire\b|\bhazard\b).*$/i, '').trim();
    }

    return { fromText, toText, hazardTexts, raw: message };
  }

  function resetUserHazards(hazardList) {
    hazards.clear();
    nodes.forEach((n, id) => {
      if (n.status === 'MAINTENANCE') hazards.add(id);
    });
    if (hazardList) hazardList.innerHTML = '';
  }

  function applyHazardsToUI(appliedHazards, hazardList) {
    for (const h of appliedHazards) {
      if (h.type === 'compound') {
        (COMPOUND[h.id] || []).forEach(sid => hazards.add(sid));
        if (hazardList) makeHazardTag(h.id, h.label, hazardList, COMPOUND[h.id]);
      } else {
        hazards.add(h.id);
        if (hazardList) makeHazardTag(h.id, h.label, hazardList, null);
      }
    }
  }

  function significantSteps(steps) {
    const out = [];
    let lastKey = '';
    steps.forEach((step, i) => {
      const n = step.node;
      const key =
        n.type === 'staircase'
          ? `${n.block}-stair-${Math.floor(i / 2)}`
          : `${n.type}-${step.id}`;
      const important =
        n.type === 'room' ||
        n.type === 'entrance' ||
        n.type === 'landmark' ||
        (n.type === 'floor_hub' && !lastKey.startsWith(`floor_hub-${n.block}`)) ||
        (n.type === 'staircase' && !lastKey.startsWith(`${n.block}-stair`)) ||
        (n.type === 'road' && /front|gate|circle|canteen/.test(step.id));
      if (important || i === 0 || i === steps.length - 1) {
        out.push(step);
        lastKey = `${n.type}-${n.block || step.id}`;
      }
    });
    return out;
  }

  function describeRouteChoice(steps, appliedHazards) {
    const notes = [];
    const blockedBlocks = appliedHazards.filter(h => h.type === 'compound').map(h => h.block);
    const stairBlocks = new Set(
      steps.filter(s => s.node.type === 'staircase' && s.node.block).map(s => s.node.block)
    );
    const altStairBlocks = [...stairBlocks].filter(b => !blockedBlocks.includes(b));

    appliedHazards.forEach(h => {
      if (h.type === 'compound') {
        notes.push(`${h.block} staircases/exits are CLOSED due to fire.`);
      } else {
        notes.push(`${h.label} is blocked.`);
      }
    });

    if (blockedBlocks.length && altStairBlocks.length) {
      notes.push(`Alternate route uses ${altStairBlocks.join(' and ')} staircase sector(s).`);
    }

    if (steps.some(s => s.id === 'b_east_exit')) {
      notes.push('East Exit (beside B-G05) is used as an escape path.');
    }
    if (steps.some(s => s.id.startsWith('pg_') && blockedBlocks.includes('B-BLOCK'))) {
      notes.push('Skybridge connection to PG-Block is part of this evacuation path.');
    }

    return notes;
  }

  function formatChatRouteMessage(fromId, toId, result, appliedHazards) {
    const fromName = nodes.get(fromId)?.name || fromId;
    const toName = nodes.get(toId)?.name || toId;
    if (!result) {
      return (
        `NO SAFE ROUTE FOUND\n\nFrom: ${fromName}\nTo: ${toName}\n\n` +
        (appliedHazards.length
          ? `Blocked zones: ${appliedHazards.map(h => h.label).join(', ')}\n\n`
          : '') +
        'All paths appear blocked. Try removing a hazard or choosing a different destination.'
      );
    }

    const keySteps = significantSteps(result.steps);
    const detours = describeRouteChoice(result.steps, appliedHazards);
    const lines = [
      'SAFEST AVAILABLE EVACUATION ROUTE',
      '',
      `From: ${fromName}`,
      `To: ${toName}`,
    ];

    if (detours.length) {
      lines.push('', 'Situation:');
      detours.forEach(n => lines.push(`• ${n}`));
    }

    lines.push('', `Safety assessment: ${result.safetyLevel} (risk score ${result.riskScore}).`);
    lines.push('The algorithm avoids blocked zones and prioritizes lower-risk paths before shorter distance.');
    lines.push('', 'Follow this path:');
    keySteps.forEach((step, i) => {
      lines.push(`${i + 1}. ${step.node.name}`);
    });

    lines.push(
      '',
      `Safest route drawn on the 3D map (${result.totalDistance} units, ${result.steps.length} nodes).`,
      'Check the Route Finder panel on the right for the full step list.'
    );

    return lines.join('\n');
  }

  function planRouteFromChat(message) {
    if (!nodes.size) {
      return { error: 'Campus routing graph is still loading. Please try again in a few seconds.' };
    }

    const parsed = parseRoutingRequest(message);
    if (!parsed) return null;

    const fromSel = document.getElementById('route-from');
    const toSel = document.getElementById('route-to');
    const hazardList = document.getElementById('hazard-list');

    let fromId = parsed.fromText ? resolveNode(parsed.fromText) : null;
    let toId = parsed.toText ? resolveNode(parsed.toText) : null;

    // Never silently reuse the old dropdown location when the user supplied a
    // start/destination in chat. Returning an error is safer than routing from
    // the wrong block.
    if (!fromId && !parsed.fromText && fromSel?.value && nodes.has(fromSel.value)) fromId = fromSel.value;
    if (!toId && !parsed.toText && toSel?.value && nodes.has(toSel.value)) toId = toSel.value;
    if (!toId) toId = 'main_gate';

    if (!fromId) {
      return {
        error:
          `Could not identify START location from "${parsed.fromText || message}".\n` +
          'Try: "from b-417", "I am in B-417", or "starting at B-Block Floor 4".',
      };
    }
    if (!toId || !nodes.has(toId)) {
      return {
        error:
          `Could not identify DESTINATION from "${parsed.toText || message}".\n` +
          'Try: "to main gate", "reach main gate", or a room/block name.',
      };
    }

    const appliedHazards = [];
    parsed.hazardTexts.forEach(text => {
      const spec = resolveHazardSpec(text);
      if (spec && !appliedHazards.some(h => h.id === spec.id)) appliedHazards.push(spec);
    });

    if (!appliedHazards.length) {
      const inlineHazard = resolveHazardSpec(message);
      if (inlineHazard && !appliedHazards.some(h => h.id === inlineHazard.id)) {
        appliedHazards.push(inlineHazard);
      }
    }

    resetUserHazards(hazardList);
    applyHazardsToUI(appliedHazards, hazardList);

    if (fromSel) fromSel.value = fromId;
    if (toSel) toSel.value = toId;

    const result = dijkstra(fromId, toId);
    renderRoute(result);

    return {
      success: !!result,
      fromId,
      toId,
      appliedHazards,
      result,
      message: formatChatRouteMessage(fromId, toId, result, appliedHazards),
    };
  }

  let _polls = 0;
  function poll() {
    try {
      if (typeof campusData !== 'undefined' && campusData && campusData.floors && campusData.floors.length > 1) {
        buildGraph(campusData); setupUI(); return;
      }
    } catch (e) {}
    if (_polls++ < 120) setTimeout(poll, 100);
    else try { buildGraph(campusData); setupUI(); } catch (e) {}
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', poll)
    : poll();

  global._campusRouter = {
    nodes, adj, hazards, COMPOUND, dijkstra, drawRoutePath3D, clearRoutePath3D,
    connectHardwareSerial, triggerSimulatedFire, executeBBlockClosureAndReroute, buildGraph,
    resolveNode, findRoomMentions, parseRoutingRequest, planRouteFromChat, renderRoute
  };

})(window);
