// --- VNRVJIET 3D Campus Procedural Inspector Core Logic ---

// State Variables
let scene, camera, renderer, controls;
let raycaster, mouse;
let isMacroView = true;
let buildingShellsList = [];
let activeSector = 'B-BLOCK'; // 'B-BLOCK' | 'PG-BLOCK'
let selectedBlock = null; // The block the user explicitly picked in the dropdown (null = no labels shown)
let activeFloorIndex = 0; // 0: Floor 1 (Ground), 1: Floor 2, 2: Floor 3, 3: Floor 4 (3rd), 4: Floor 5 (4th)
let currentRenderMode = 'realistic';
let hoveredNode = null;
let floorGroups = []; // Array of THREE.Group (one per floor)
let isTransitioning = false;
let campusData = null;

// Interactive Objects Arrays
let interactiveMeshes = []; // for raycasting
let roomsMeshMap = new Map(); // map room id -> { group, mesh, door, coreNode }
let labelsList = []; // list of HTML labels to project
let animatedConnectors = []; // cached list of connectors for high-performance render loop

// Base Material Templates — initialized inside init() after THREE is confirmed loaded
let baseMaterials = {};

// Fallback Campus Layout Data (in case local fetch fails due to CORS)
const fallbackCampusData = {
  "floors": [
    {
      "id": 1,
      "name": "Floor 1 (Ground)",
      "elevation": 0,
      "corridors": [
        {
          "x": 0,
          "z": -27.5,
          "w": 5.0,
          "h": 0.2,
          "d": 15.0
        },
        {
          "x": 23.5,
          "z": -20.0,
          "w": 32.0,
          "h": 0.2,
          "d": 4.5
        },
        {
          "x": 7.5,
          "z": 12.5,
          "w": 4.5,
          "h": 0.2,
          "d": 60.0
        },
        {
          "x": -1.25,
          "z": 40.0,
          "w": 81.5,
          "h": 0.2,
          "d": 4.5
        },
        {
          "x": -42.0,
          "z": 12.5,
          "w": 4.5,
          "h": 0.2,
          "d": 60.0
        },
        {
          "x": 39.5,
          "z": 10.0,
          "w": 4.5,
          "h": 0.2,
          "d": 60.0
        },
        {
          "x": 89.0,
          "z": 19.5,
          "w": 4.5,
          "h": 0.2,
          "d": 45.5
        },
        {
          "x": 101.0,
          "z": 19.5,
          "w": 4.5,
          "h": 0.2,
          "d": 45.5
        },
        {
          "x": 95.0,
          "z": -1.0,
          "w": 16.5,
          "h": 0.2,
          "d": 4.5
        },
        {
          "x": 95.0,
          "z": 21.0,
          "w": 16.5,
          "h": 0.2,
          "d": 4.5
        },
        {
          "x": 95.0,
          "z": 40.0,
          "w": 16.5,
          "h": 0.2,
          "d": 4.5
        },
        {
          "x": 89.0,
          "z": -72.5,
          "w": 4.5,
          "h": 0.2,
          "d": 45.5
        },
        {
          "x": 101.0,
          "z": -72.5,
          "w": 4.5,
          "h": 0.2,
          "d": 45.5
        },
        {
          "x": 95.0,
          "z": -55.0,
          "w": 16.5,
          "h": 0.2,
          "d": 4.5
        },
        {
          "x": 95.0,
          "z": -74.0,
          "w": 16.5,
          "h": 0.2,
          "d": 4.5
        },
        {
          "x": 95.0,
          "z": -96.0,
          "w": 16.5,
          "h": 0.2,
          "d": 4.5
        },
        {
          "x": -81.0,
          "z": -72.5,
          "w": 4.5,
          "h": 0.2,
          "d": 45.5
        },
        {
          "x": -69.0,
          "z": -72.5,
          "w": 4.5,
          "h": 0.2,
          "d": 45.5
        },
        {
          "x": -75.0,
          "z": -55.0,
          "w": 16.5,
          "h": 0.2,
          "d": 4.5
        },
        {
          "x": -75.0,
          "z": -74.0,
          "w": 16.5,
          "h": 0.2,
          "d": 4.5
        },
        {
          "x": -75.0,
          "z": -96.0,
          "w": 16.5,
          "h": 0.2,
          "d": 4.5
        }
      ],
      "rooms": [
        {
          "id": "stationery",
          "name": "Stationery Store",
          "x": 7.5,
          "z": -20,
          "w": 6,
          "h": 3.5,
          "d": 5,
          "status": "SECURE",
          "occupancy": "1/2",
          "temp": "21.0\u00b0C",
          "power": "0.4 kW",
          "hvac": "NOMINAL",
          "desc": "B-Block stationery & print services."
        },
        {
          "id": "ssc",
          "name": "Student Service Centre",
          "x": -7.5,
          "z": -20,
          "w": 6,
          "h": 3.5,
          "d": 5,
          "status": "SECURE",
          "occupancy": "3/5",
          "temp": "21.8\u00b0C",
          "power": "0.9 kW",
          "hvac": "NOMINAL",
          "desc": "Academic queries & student assistance."
        },
        {
          "id": "b-g01",
          "name": "B-G01",
          "x": 15,
          "z": -24.5,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "35/40",
          "temp": "22.0\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-g02",
          "name": "B-G02",
          "x": 20,
          "z": -24.5,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "28/40",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-g03",
          "name": "B-G03",
          "x": 25,
          "z": -24.5,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "WARNING",
          "occupancy": "38/40",
          "temp": "24.5\u00b0C",
          "power": "2.8 kW",
          "hvac": "OVERLOAD"
        },
        {
          "id": "b-g04",
          "name": "B-G04",
          "x": 30,
          "z": -24.5,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "0/40",
          "temp": "19.5\u00b0C",
          "power": "0.1 kW",
          "hvac": "STANDBY"
        },
        {
          "id": "b-g05",
          "name": "B-G05",
          "x": 35,
          "z": -24.5,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "15/40",
          "temp": "21.1\u00b0C",
          "power": "0.8 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-g06",
          "name": "B-G06",
          "x": 12.5,
          "z": -10,
          "w": 5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "30/40",
          "temp": "22.2\u00b0C",
          "power": "1.4 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-g07",
          "name": "B-G07",
          "x": 12.5,
          "z": -5,
          "w": 5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "35/40",
          "temp": "21.9\u00b0C",
          "power": "1.3 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-g08",
          "name": "B-G08",
          "x": 12.5,
          "z": 0,
          "w": 5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "24/40",
          "temp": "21.0\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-g09",
          "name": "B-G09",
          "x": 12.5,
          "z": 5,
          "w": 5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "31/40",
          "temp": "22.1\u00b0C",
          "power": "1.4 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-g10",
          "name": "B-G10",
          "x": 12.5,
          "z": 10,
          "w": 5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "18/40",
          "temp": "20.9\u00b0C",
          "power": "0.9 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-g11",
          "name": "B-G11",
          "x": 12.5,
          "z": 15,
          "w": 5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "22/40",
          "temp": "21.4\u00b0C",
          "power": "1.0 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-g12",
          "name": "B-G12",
          "x": 12.5,
          "z": 20,
          "w": 5,
          "h": 3.5,
          "d": 4.5,
          "status": "MAINTENANCE",
          "occupancy": "0/0",
          "temp": "18.0\u00b0C",
          "power": "0.0 kW",
          "hvac": "OFF"
        },
        {
          "id": "b-g13",
          "name": "B-G13",
          "x": 12.5,
          "z": 25,
          "w": 5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "27/40",
          "temp": "21.7\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-g14",
          "name": "B-G14",
          "x": 12.5,
          "z": 30,
          "w": 5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "14/40",
          "temp": "20.8\u00b0C",
          "power": "0.7 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-g15",
          "name": "B-G15",
          "x": 12.5,
          "z": 35,
          "w": 5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "20/40",
          "temp": "21.0\u00b0C",
          "power": "0.9 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "garden",
          "name": "Garden Area",
          "x": -17.25,
          "z": 10.125,
          "w": 45.0,
          "h": 0.05,
          "d": 55.25,
          "status": "GARDEN",
          "desc": "B-Block central green garden space."
        },
        {
          "id": "b-g16",
          "name": "B-G16",
          "x": 7.0,
          "z": 44.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "32/40",
          "temp": "22.3\u00b0C",
          "power": "1.6 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-g17",
          "name": "B-G17",
          "x": 0.5,
          "z": 44.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "25/40",
          "temp": "21.8\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-g18",
          "name": "B-G18",
          "x": -6.0,
          "z": 44.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "12/40",
          "temp": "20.9\u00b0C",
          "power": "0.8 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "workshop-1",
          "name": "Workshop 1",
          "x": -12.75,
          "z": 44.5,
          "w": 5.5,
          "h": 3.5,
          "d": 6.0,
          "status": "SECURE",
          "desc": "B-Block Workshop 1."
        },
        {
          "id": "workshop-2",
          "name": "Workshop 2",
          "x": -19.75,
          "z": 44.5,
          "w": 5.5,
          "h": 3.5,
          "d": 6.0,
          "status": "SECURE",
          "desc": "B-Block Workshop 2."
        },
        {
          "id": "washroom-1",
          "name": "Washroom 1",
          "x": -26.0,
          "z": 44.5,
          "w": 4.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "1/10",
          "temp": "20.2\u00b0C",
          "power": "0.3 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "washroom-2",
          "name": "Washroom 2",
          "x": -31.5,
          "z": 44.5,
          "w": 4.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "2/10",
          "temp": "20.5\u00b0C",
          "power": "0.3 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "ksa",
          "name": "KS Auditorium",
          "x": -47.5,
          "z": 20.0,
          "w": 9.0,
          "h": 5.0,
          "d": 12.0,
          "status": "SECURE",
          "desc": "Main Auditorium venue."
        },
        {
          "id": "seminar",
          "name": "B-Block Seminar Hall",
          "x": -47.0,
          "z": 6.0,
          "w": 8.0,
          "h": 4.5,
          "d": 10.0,
          "status": "SECURE",
          "desc": "B-Block seminar hall."
        },
        {
          "id": "rattaiah_square",
          "name": "Rattaiah Square",
          "x": 26.125,
          "z": 7.75,
          "w": 22.25,
          "h": 0.05,
          "d": 60.0,
          "status": "GARDEN",
          "desc": "Rattaiah Square open-air garden courtyard."
        },
        {
          "id": "b-g20",
          "name": "B-G20",
          "x": 44.0,
          "z": -12.25,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "30/40",
          "temp": "21.6\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-g21",
          "name": "B-G21",
          "x": 44.0,
          "z": -2.25,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "22/40",
          "temp": "22.0\u00b0C",
          "power": "1.3 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-g22",
          "name": "B-G22",
          "x": 44.0,
          "z": 7.75,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "26/40",
          "temp": "21.4\u00b0C",
          "power": "1.0 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "lab-3",
          "name": "Lab 3",
          "x": 44.75,
          "z": 18.5,
          "w": 6.0,
          "h": 3.5,
          "d": 6.0,
          "status": "SECURE",
          "desc": "CS research lab."
        },
        {
          "id": "lab-4",
          "name": "Lab 4",
          "x": 44.75,
          "z": 30.0,
          "w": 6.0,
          "h": 3.5,
          "d": 6.0,
          "status": "SECURE",
          "desc": "Robotics lab."
        },
        {
          "id": "lab-1",
          "name": "Lab 1",
          "x": 32.75,
          "z": 44.5,
          "w": 5.5,
          "h": 3.5,
          "d": 6.0,
          "status": "SECURE",
          "desc": "Ground floor computer science lab."
        },
        {
          "id": "lab-2",
          "name": "Lab 2",
          "x": 25.75,
          "z": 44.5,
          "w": 5.5,
          "h": 3.5,
          "d": 6.0,
          "status": "SECURE",
          "desc": "Ground floor electronics lab."
        },
        {
          "id": "b-g23",
          "name": "B-G23",
          "x": 19.25,
          "z": 44.5,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "18/40",
          "temp": "21.1\u00b0C",
          "power": "0.9 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-g24",
          "name": "B-G24",
          "x": 13.25,
          "z": 44.5,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "0/40",
          "temp": "19.8\u00b0C",
          "power": "0.2 kW",
          "hvac": "STANDBY"
        },
        {
          "id": "pg_garden_g",
          "name": "PG Central Garden Courtyard",
          "x": 95.0,
          "z": 10.0,
          "w": 15.0,
          "h": 0.05,
          "d": 18.0,
          "status": "GARDEN",
          "desc": "Open-air central garden courtyard of PG Block."
        },
        {
          "id": "pg-g01",
          "name": "PG-G01",
          "x": 82.5,
          "z": -1.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "21/35",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg-g02",
          "name": "PG-G02",
          "x": 82.5,
          "z": 5.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "22/35",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg-g03",
          "name": "PG-G03",
          "x": 82.5,
          "z": 11.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "23/35",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg-g04",
          "name": "PG-G04",
          "x": 82.5,
          "z": 17.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "24/35",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg-g05",
          "name": "PG-G05",
          "x": 107.5,
          "z": -1.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "20/35",
          "temp": "21.2\u00b0C",
          "power": "1.0 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg-g06",
          "name": "PG-G06",
          "x": 107.5,
          "z": 5.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "21/35",
          "temp": "21.2\u00b0C",
          "power": "1.0 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg-g07",
          "name": "PG-G07",
          "x": 107.5,
          "z": 11.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "22/35",
          "temp": "21.2\u00b0C",
          "power": "1.0 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg-g08",
          "name": "PG-G08",
          "x": 107.5,
          "z": 17.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "23/35",
          "temp": "21.2\u00b0C",
          "power": "1.0 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg-g09",
          "name": "PG-G09",
          "x": 91.5,
          "z": -6.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "28/35",
          "temp": "21.8\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg-g10",
          "name": "PG-G10",
          "x": 98.5,
          "z": -6.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "28/35",
          "temp": "21.8\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg-g11",
          "name": "PG-G11",
          "x": 82.5,
          "z": 26.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "18/35",
          "temp": "21.0\u00b0C",
          "power": "0.9 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg-g12",
          "name": "PG-G12",
          "x": 107.5,
          "z": 26.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "18/35",
          "temp": "21.0\u00b0C",
          "power": "0.9 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg_seminar_g",
          "name": "PG Seminar Hall",
          "x": 95.0,
          "z": 27.5,
          "w": 8.0,
          "h": 4.0,
          "d": 6.0,
          "status": "SECURE",
          "occupancy": "40/60",
          "temp": "21.5\u00b0C",
          "power": "3.5 kW",
          "hvac": "NOMINAL",
          "desc": "PG Block FLR 1 main facility space."
        },
        {
          "id": "pg-g13",
          "name": "PG-G13",
          "x": 82.5,
          "z": 33.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "25/40",
          "temp": "21.5\u00b0C",
          "power": "1.0 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg-g14",
          "name": "PG-G14",
          "x": 107.5,
          "z": 33.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "30/40",
          "temp": "22.0\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg-g15",
          "name": "PG-G15",
          "x": 82.5,
          "z": 46.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "18/40",
          "temp": "21.2\u00b0C",
          "power": "0.9 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg-g16",
          "name": "PG-G16",
          "x": 91.5,
          "z": 46.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "22/40",
          "temp": "21.8\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg-g17",
          "name": "PG-G17",
          "x": 98.5,
          "z": 46.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "25/40",
          "temp": "21.5\u00b0C",
          "power": "1.0 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg-g18",
          "name": "PG-G18",
          "x": 107.5,
          "z": 46.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "28/40",
          "temp": "22.0\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "jsk_greens",
          "name": "JSK Greens (Central Park)",
          "x": 95.0,
          "z": -27.5,
          "w": 45.0,
          "h": 0.1,
          "d": 35.0,
          "status": "SECURE",
          "occupancy": "120/500",
          "temp": "24.0\u00b0C",
          "power": "0.0 kW",
          "desc": "Central park & lush garden square positioned directly between PG-Block and D-Block."
        },
        {
          "id": "d_garden_g",
          "name": "D Central Garden Courtyard",
          "x": 95.0,
          "z": -75.0,
          "w": 15.0,
          "h": 0.1,
          "d": 18.0,
          "status": "SECURE",
          "occupancy": "0/0",
          "temp": "23.5\u00b0C",
          "power": "0.0 kW",
          "desc": "Open-air central garden courtyard of D Block."
        },
        {
          "id": "d_seminar_g",
          "name": "D Seminar Hall",
          "x": 95.0,
          "z": -92.5,
          "w": 8.0,
          "h": 3.5,
          "d": 6.0,
          "status": "SECURE",
          "occupancy": "45/60",
          "temp": "21.0\u00b0C",
          "power": "2.2 kW",
          "desc": "D Block FLR 1 main facility space."
        },
        {
          "id": "d-g01",
          "name": "D-G01",
          "x": 82.5,
          "z": -64.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "20/40",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d-g02",
          "name": "D-G02",
          "x": 82.5,
          "z": -70.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "22/40",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d-g03",
          "name": "D-G03",
          "x": 82.5,
          "z": -76.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "24/40",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d-g04",
          "name": "D-G04",
          "x": 82.5,
          "z": -82.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "26/40",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d-g11",
          "name": "D-G11",
          "x": 82.5,
          "z": -88.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "28/40",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d-g13",
          "name": "D-G13",
          "x": 82.5,
          "z": -94.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "30/40",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d-g05",
          "name": "D-G05",
          "x": 107.5,
          "z": -64.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "22/40",
          "temp": "21.8\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d-g06",
          "name": "D-G06",
          "x": 107.5,
          "z": -70.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "24/40",
          "temp": "21.8\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d-g07",
          "name": "D-G07",
          "x": 107.5,
          "z": -76.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "26/40",
          "temp": "21.8\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d-g08",
          "name": "D-G08",
          "x": 107.5,
          "z": -82.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "28/40",
          "temp": "21.8\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d-g12",
          "name": "D-G12",
          "x": 107.5,
          "z": -88.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "30/40",
          "temp": "21.8\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d-g14",
          "name": "D-G14",
          "x": 107.5,
          "z": -94.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "32/40",
          "temp": "21.8\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d-g15",
          "name": "D-G15",
          "x": 82.5,
          "z": -48.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "24/40",
          "temp": "21.4\u00b0C",
          "power": "1.0 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d-g16",
          "name": "D-G16",
          "x": 91.5,
          "z": -48.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "28/40",
          "temp": "21.9\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d-g17",
          "name": "D-G17",
          "x": 98.5,
          "z": -48.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "29/40",
          "temp": "21.7\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d-g18",
          "name": "D-G18",
          "x": 107.5,
          "z": -48.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "32/40",
          "temp": "22.1\u00b0C",
          "power": "1.3 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d-g09",
          "name": "D-G09",
          "x": 91.5,
          "z": -101.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "15/40",
          "temp": "21.0\u00b0C",
          "power": "0.9 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d-g10",
          "name": "D-G10",
          "x": 98.5,
          "z": -101.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "18/40",
          "temp": "21.2\u00b0C",
          "power": "1.0 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e_garden_g",
          "name": "D Central Garden Courtyard",
          "x": -75.0,
          "z": -75.0,
          "w": 15.0,
          "h": 0.1,
          "d": 18.0,
          "status": "SECURE",
          "occupancy": "0/0",
          "temp": "23.5\u00b0C",
          "power": "0.0 kW",
          "desc": "Open-air central garden courtyard of E Block."
        },
        {
          "id": "e_seminar_g",
          "name": "D Seminar Hall",
          "x": -75.0,
          "z": -92.5,
          "w": 8.0,
          "h": 3.5,
          "d": 6.0,
          "status": "SECURE",
          "occupancy": "45/60",
          "temp": "21.0\u00b0C",
          "power": "2.2 kW",
          "desc": "E Block FLR 1 main facility space."
        },
        {
          "id": "e-g01",
          "name": "E-G01",
          "x": -87.5,
          "z": -64.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "20/40",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e-g02",
          "name": "E-G02",
          "x": -87.5,
          "z": -70.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "22/40",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e-g03",
          "name": "E-G03",
          "x": -87.5,
          "z": -76.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "24/40",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e-g04",
          "name": "E-G04",
          "x": -87.5,
          "z": -82.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "26/40",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e-g11",
          "name": "E-G11",
          "x": -87.5,
          "z": -88.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "28/40",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e-g13",
          "name": "E-G13",
          "x": -87.5,
          "z": -94.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "30/40",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e-g05",
          "name": "E-G05",
          "x": -62.5,
          "z": -64.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "22/40",
          "temp": "21.8\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e-g06",
          "name": "E-G06",
          "x": -62.5,
          "z": -70.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "24/40",
          "temp": "21.8\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e-g07",
          "name": "E-G07",
          "x": -62.5,
          "z": -76.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "26/40",
          "temp": "21.8\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e-g08",
          "name": "E-G08",
          "x": -62.5,
          "z": -82.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "28/40",
          "temp": "21.8\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e-g12",
          "name": "E-G12",
          "x": -62.5,
          "z": -88.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "30/40",
          "temp": "21.8\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e-g14",
          "name": "E-G14",
          "x": -62.5,
          "z": -94.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "32/40",
          "temp": "21.8\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e-g15",
          "name": "E-G15",
          "x": -87.5,
          "z": -48.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "24/40",
          "temp": "21.4\u00b0C",
          "power": "1.0 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e-g16",
          "name": "E-G16",
          "x": -78.5,
          "z": -48.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "28/40",
          "temp": "21.9\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e-g17",
          "name": "E-G17",
          "x": -71.5,
          "z": -48.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "29/40",
          "temp": "21.7\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e-g18",
          "name": "E-G18",
          "x": -62.5,
          "z": -48.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "32/40",
          "temp": "22.1\u00b0C",
          "power": "1.3 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e-g09",
          "name": "E-G09",
          "x": -78.5,
          "z": -101.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "15/40",
          "temp": "21.0\u00b0C",
          "power": "0.9 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e-g10",
          "name": "E-G10",
          "x": -71.5,
          "z": -101.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "18/40",
          "temp": "21.2\u00b0C",
          "power": "1.0 kW",
          "hvac": "NOMINAL"
        }
      ],
      "connectors": [
        {
          "id": "Main_to_PG_Skybridge",
          "name": "Main to PG Skybridge",
          "type": "skybridge",
          "x": 64.25,
          "z": 40.0,
          "w": 49.5,
          "h": 3.2,
          "d": 4.5,
          "start": {
            "x": 39.5,
            "z": 40.0
          },
          "target": {
            "x": 89.0,
            "z": 40.0
          }
        },
        {
          "id": "road_main_to_jsk",
          "name": "Main CBA to JSK Greens Pathway",
          "type": "walking_path",
          "x": 67.25,
          "z": -18.75,
          "w": 55.5,
          "h": 0.1,
          "d": 4.0,
          "start": {
            "x": 39.5,
            "z": -10.0
          },
          "target": {
            "x": 95.0,
            "z": -27.5
          }
        },
        {
          "id": "road_pg_to_jsk",
          "name": "PG-Block to JSK Greens Avenue",
          "type": "walking_path",
          "x": 95.0,
          "z": -17.0,
          "w": 4.0,
          "h": 0.1,
          "d": 21.0,
          "start": {
            "x": 95.0,
            "z": -6.5
          },
          "target": {
            "x": 95.0,
            "z": -27.5
          }
        },
        {
          "id": "road_d_to_jsk",
          "name": "JSK Greens to D-Block Avenue",
          "type": "walking_path",
          "x": 95.0,
          "z": -38.0,
          "w": 4.0,
          "h": 0.1,
          "d": 21.0,
          "start": {
            "x": 95.0,
            "z": -27.5
          },
          "target": {
            "x": 95.0,
            "z": -48.5
          }
        }
      ],
      "staircases": [
        {
          "id": "staircase-lab-1-4",
          "name": "Lab 1-4 Multi-Floor Staircase",
          "x": 39.5,
          "z": 35.0,
          "height": 8.0,
          "type": "multi_floor_stair"
        },
        {
          "id": "staircase-b-east-ext",
          "name": "B-Block East Exit Steps (beside B-G05)",
          "x": 39.5,
          "z": -27.5,
          "height": 4.0
        },
        {
          "id": "staircase-grand-ext",
          "name": "Main Exterior Grand Staircase",
          "x": 0,
          "z": -38.0,
          "height": 8.0
        },
        {
          "id": "Internal_V_Staircase",
          "name": "Internal V-Shaped Staircase",
          "x": 0,
          "z": -20.0,
          "height": 8.0,
          "type": "v_switchback",
          "connects": [
            "FLR 1",
            "FLR 2"
          ],
          "from": "Ground Floor Corridor (between Stationery & SSC)",
          "to": "FLR 2 Corridor (left of Accounts Section)"
        },
        {
          "id": "staircase-rattaiah",
          "name": "Rattaiah Staircase",
          "x": 39.5,
          "z": 35.0,
          "height": 8.0
        },
        {
          "id": "staircase-central-tower",
          "name": "Central Tower Staircase",
          "x": -42.0,
          "z": 20.0,
          "height": 32.0
        },
        {
          "id": "staircase-pg-ext",
          "name": "PG Entrance Grand Steps",
          "x": 95.0,
          "z": -12.0,
          "height": 4.0
        },
        {
          "id": "staircase-pg-internal",
          "name": "PG Internal V-Staircase",
          "x": 95.0,
          "z": 21.0,
          "height": 8.0,
          "type": "v_switchback",
          "connects": [
            "FLR 1",
            "FLR 2"
          ],
          "from": "PG FLR 1 Corridor",
          "to": "PG FLR 2 Corridor"
        },
        {
          "id": "staircase-d-ext",
          "name": "D Entrance Grand Steps",
          "x": 95.0,
          "z": -48.5,
          "w": 6.0,
          "h": 3.5,
          "d": 8.0
        },
        {
          "id": "staircase-d-internal",
          "name": "D Internal V-Staircase",
          "x": 95.0,
          "z": -75.0,
          "w": 4.0,
          "h": 4.0,
          "d": 4.0,
          "type": "Internal_V_Staircase",
          "from": "D FLR 1 Corridor",
          "to": "D FLR 2 Corridor"
        }
      ]
    },
    {
      "id": 2,
      "name": "Floor 2 (First)",
      "elevation": 8.0,
      "corridors": [
        {
          "x": 0,
          "z": -20.0,
          "w": 5.0,
          "h": 0.2,
          "d": 35.0
        },
        {
          "x": -21.0,
          "z": -20.0,
          "w": 42.0,
          "h": 0.2,
          "d": 4.5
        },
        {
          "x": -42.0,
          "z": 10.0,
          "w": 4.5,
          "h": 0.2,
          "d": 60.0
        },
        {
          "x": -1.25,
          "z": 40.0,
          "w": 81.5,
          "h": 0.2,
          "d": 4.5
        },
        {
          "x": -16.0,
          "z": 10.0,
          "w": 4.5,
          "h": 0.2,
          "d": 60.0
        },
        {
          "x": 23.5,
          "z": -20.0,
          "w": 32.0,
          "h": 0.2,
          "d": 4.5
        },
        {
          "x": 7.5,
          "z": 12.5,
          "w": 4.5,
          "h": 0.2,
          "d": 60.0
        },
        {
          "x": 39.5,
          "z": 10.0,
          "w": 4.5,
          "h": 0.2,
          "d": 60.0
        },
        {
          "x": 89.0,
          "z": 19.5,
          "w": 4.5,
          "h": 0.2,
          "d": 45.5
        },
        {
          "x": 101.0,
          "z": 19.5,
          "w": 4.5,
          "h": 0.2,
          "d": 45.5
        },
        {
          "x": 95.0,
          "z": -1.0,
          "w": 16.5,
          "h": 0.2,
          "d": 4.5
        },
        {
          "x": 95.0,
          "z": 21.0,
          "w": 16.5,
          "h": 0.2,
          "d": 4.5
        },
        {
          "x": 95.0,
          "z": 40.0,
          "w": 16.5,
          "h": 0.2,
          "d": 4.5
        },
        {
          "x": 89.0,
          "z": -72.5,
          "w": 4.5,
          "h": 0.2,
          "d": 45.5
        },
        {
          "x": 101.0,
          "z": -72.5,
          "w": 4.5,
          "h": 0.2,
          "d": 45.5
        },
        {
          "x": 95.0,
          "z": -55.0,
          "w": 16.5,
          "h": 0.2,
          "d": 4.5
        },
        {
          "x": 95.0,
          "z": -74.0,
          "w": 16.5,
          "h": 0.2,
          "d": 4.5
        },
        {
          "x": 95.0,
          "z": -96.0,
          "w": 16.5,
          "h": 0.2,
          "d": 4.5
        },
        {
          "x": -81.0,
          "z": -72.5,
          "w": 4.5,
          "h": 0.2,
          "d": 45.5
        },
        {
          "x": -69.0,
          "z": -72.5,
          "w": 4.5,
          "h": 0.2,
          "d": 45.5
        },
        {
          "x": -75.0,
          "z": -55.0,
          "w": 16.5,
          "h": 0.2,
          "d": 4.5
        },
        {
          "x": -75.0,
          "z": -74.0,
          "w": 16.5,
          "h": 0.2,
          "d": 4.5
        },
        {
          "x": -75.0,
          "z": -96.0,
          "w": 16.5,
          "h": 0.2,
          "d": 4.5
        }
      ],
      "rooms": [
        {
          "id": "accounts",
          "name": "Accounts Section",
          "x": -12.5,
          "z": -24.5,
          "w": 6.0,
          "h": 3.5,
          "d": 5.0,
          "status": "SECURE",
          "occupancy": "12/15",
          "temp": "21.5\u00b0C",
          "power": "0.6 kW",
          "hvac": "NOMINAL",
          "desc": "Accounts and payroll office."
        },
        {
          "id": "panda_punnaiah_square",
          "name": "Panda Punnaiah Square",
          "x": -32.875,
          "z": 10.125,
          "w": 20.25,
          "h": 0.05,
          "d": 55.25,
          "status": "GARDEN",
          "desc": "Panda Punnaiah Square elevated garden courtyard."
        },
        {
          "id": "library",
          "name": "Library",
          "x": -47.5,
          "z": 13.5,
          "w": 9.0,
          "h": 5.0,
          "d": 26.0,
          "status": "SECURE",
          "occupancy": "85/150",
          "temp": "21.0\u00b0C",
          "power": "2.4 kW",
          "hvac": "NOMINAL",
          "desc": "Massive Floor 2 campus library spanning above the Auditorium."
        },
        {
          "id": "workshop-1-f2",
          "name": "Workshop 1",
          "x": -35.0,
          "z": 44.5,
          "w": 5.5,
          "h": 3.5,
          "d": 6.0,
          "status": "SECURE",
          "desc": "Floor 2 CS workshop."
        },
        {
          "id": "workshop-2-f2",
          "name": "Workshop 2",
          "x": -28.0,
          "z": 44.5,
          "w": 5.5,
          "h": 3.5,
          "d": 6.0,
          "status": "SECURE",
          "desc": "Floor 2 electronics workshop."
        },
        {
          "id": "washroom-1a-f2",
          "name": "Washroom 1A",
          "x": -9.0,
          "z": 44.5,
          "w": 4.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "1/5",
          "temp": "20.1\u00b0C",
          "power": "0.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "washroom-1b-f2",
          "name": "Washroom 1B",
          "x": -4.0,
          "z": 44.5,
          "w": 4.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "2/5",
          "temp": "20.4\u00b0C",
          "power": "0.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-101",
          "name": "B-101",
          "x": -20.5,
          "z": -10.0,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "30/40",
          "temp": "21.5\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-102",
          "name": "B-102",
          "x": -20.5,
          "z": -5.0,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "28/40",
          "temp": "21.6\u00b0C",
          "power": "1.0 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-103",
          "name": "B-103",
          "x": -20.5,
          "z": 0.0,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "35/40",
          "temp": "22.0\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-104",
          "name": "B-104",
          "x": -20.5,
          "z": 5.0,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "0/40",
          "temp": "19.5\u00b0C",
          "power": "0.1 kW",
          "hvac": "STANDBY"
        },
        {
          "id": "b-105",
          "name": "B-105",
          "x": -20.5,
          "z": 10.0,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "25/40",
          "temp": "21.8\u00b0C",
          "power": "0.9 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-106",
          "name": "B-106",
          "x": -20.5,
          "z": 15.0,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "33/40",
          "temp": "22.2\u00b0C",
          "power": "1.4 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-107",
          "name": "B-107",
          "x": -20.5,
          "z": 20.0,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "MAINTENANCE",
          "occupancy": "0/0",
          "temp": "18.0\u00b0C",
          "power": "0.0 kW",
          "hvac": "OFF"
        },
        {
          "id": "b-108",
          "name": "B-108",
          "x": -20.5,
          "z": 25.0,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "20/40",
          "temp": "21.1\u00b0C",
          "power": "0.8 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-109",
          "name": "B-109",
          "x": -20.5,
          "z": 30.0,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "14/40",
          "temp": "20.8\u00b0C",
          "power": "0.7 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-110",
          "name": "B-110",
          "x": -20.5,
          "z": 35.0,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "24/40",
          "temp": "21.0\u00b0C",
          "power": "0.9 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "rattaiah_square_f2",
          "name": "Rattaiah Square Balcony",
          "x": 26.125,
          "z": 7.75,
          "w": 22.25,
          "h": 0.05,
          "d": 60.0,
          "status": "GARDEN",
          "desc": "Floor 2 open-air balcony overlooking Rattaiah Square."
        },
        {
          "id": "b-120",
          "name": "B-120",
          "x": 15,
          "z": -24.5,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "35/40",
          "temp": "22.0\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-119",
          "name": "B-119",
          "x": 20,
          "z": -24.5,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "28/40",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-118",
          "name": "B-118",
          "x": 25,
          "z": -24.5,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "WARNING",
          "occupancy": "38/40",
          "temp": "24.5\u00b0C",
          "power": "2.8 kW",
          "hvac": "OVERLOAD"
        },
        {
          "id": "b-117",
          "name": "B-117",
          "x": 30,
          "z": -24.5,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "0/40",
          "temp": "19.5\u00b0C",
          "power": "0.1 kW",
          "hvac": "STANDBY"
        },
        {
          "id": "b-116",
          "name": "B-116",
          "x": 35,
          "z": -24.5,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "15/40",
          "temp": "21.1\u00b0C",
          "power": "0.8 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-121",
          "name": "B-121",
          "x": 44.0,
          "z": -12.25,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "30/40",
          "temp": "21.6\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-122",
          "name": "B-122",
          "x": 44.0,
          "z": -2.25,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "22/40",
          "temp": "22.0\u00b0C",
          "power": "1.3 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-123",
          "name": "B-123",
          "x": 44.0,
          "z": 7.75,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "26/40",
          "temp": "21.4\u00b0C",
          "power": "1.0 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "lab-3b",
          "name": "Lab 3B",
          "x": 44.75,
          "z": 18.5,
          "w": 6.0,
          "h": 3.5,
          "d": 6.0,
          "status": "SECURE",
          "desc": "Floor 2 CS research lab."
        },
        {
          "id": "lab-4b",
          "name": "Lab 4B",
          "x": 44.75,
          "z": 30.0,
          "w": 6.0,
          "h": 3.5,
          "d": 6.0,
          "status": "SECURE",
          "desc": "Floor 2 robotics lab."
        },
        {
          "id": "lab-1b",
          "name": "Lab 1B",
          "x": 32.75,
          "z": 44.5,
          "w": 5.5,
          "h": 3.5,
          "d": 6.0,
          "status": "SECURE",
          "desc": "Floor 2 computer science lab."
        },
        {
          "id": "lab-2b",
          "name": "Lab 2B",
          "x": 25.75,
          "z": 44.5,
          "w": 5.5,
          "h": 3.5,
          "d": 6.0,
          "status": "SECURE",
          "desc": "Floor 2 electronics lab."
        },
        {
          "id": "b-124",
          "name": "B-124",
          "x": 19.25,
          "z": 44.5,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "18/40",
          "temp": "21.1\u00b0C",
          "power": "0.9 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-125",
          "name": "B-125",
          "x": 13.25,
          "z": 44.5,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "0/40",
          "temp": "19.8\u00b0C",
          "power": "0.2 kW",
          "hvac": "STANDBY"
        },
        {
          "id": "b-111",
          "name": "B-111",
          "x": 12.5,
          "z": -10,
          "w": 5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "30/40",
          "temp": "22.2\u00b0C",
          "power": "1.4 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-112",
          "name": "B-112",
          "x": 12.5,
          "z": -5,
          "w": 5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "35/40",
          "temp": "21.9\u00b0C",
          "power": "1.3 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-113",
          "name": "B-113",
          "x": 12.5,
          "z": 0,
          "w": 5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "24/40",
          "temp": "21.0\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-114",
          "name": "B-114",
          "x": 12.5,
          "z": 5,
          "w": 5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "31/40",
          "temp": "22.1\u00b0C",
          "power": "1.4 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-115",
          "name": "B-115",
          "x": 12.5,
          "z": 10,
          "w": 5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "18/40",
          "temp": "20.9\u00b0C",
          "power": "0.9 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-116-c",
          "name": "B-116",
          "x": 12.5,
          "z": 15,
          "w": 5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "22/40",
          "temp": "21.4\u00b0C",
          "power": "1.0 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-117-c",
          "name": "B-117",
          "x": 12.5,
          "z": 20,
          "w": 5,
          "h": 3.5,
          "d": 4.5,
          "status": "MAINTENANCE",
          "occupancy": "0/0",
          "temp": "18.0\u00b0C",
          "power": "0.0 kW",
          "hvac": "OFF"
        },
        {
          "id": "b-118-c",
          "name": "B-118",
          "x": 12.5,
          "z": 25,
          "w": 5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "27/40",
          "temp": "21.7\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-119-c",
          "name": "B-119",
          "x": 12.5,
          "z": 30,
          "w": 5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "14/40",
          "temp": "20.8\u00b0C",
          "power": "0.7 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-120-c",
          "name": "B-120",
          "x": 12.5,
          "z": 35,
          "w": 5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "20/40",
          "temp": "21.0\u00b0C",
          "power": "0.9 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-126",
          "name": "B-126",
          "x": 7.0,
          "z": 44.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "32/40",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-127",
          "name": "B-127",
          "x": 1.5,
          "z": 44.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "28/40",
          "temp": "21.8\u00b0C",
          "power": "1.0 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg_balcony_f2",
          "name": "PG Garden Balcony (FLR 2)",
          "x": 95.0,
          "z": 10.0,
          "w": 15.0,
          "h": 0.05,
          "d": 18.0,
          "status": "GARDEN",
          "desc": "Floor 2 interior perimeter balcony overlooking PG Central Garden."
        },
        {
          "id": "pg-101",
          "name": "PG-101",
          "x": 82.5,
          "z": -1.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "21/35",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg-102",
          "name": "PG-102",
          "x": 82.5,
          "z": 5.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "22/35",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg-103",
          "name": "PG-103",
          "x": 82.5,
          "z": 11.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "23/35",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg-104",
          "name": "PG-104",
          "x": 82.5,
          "z": 17.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "24/35",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg-105",
          "name": "PG-105",
          "x": 107.5,
          "z": -1.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "20/35",
          "temp": "21.2\u00b0C",
          "power": "1.0 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg-106",
          "name": "PG-106",
          "x": 107.5,
          "z": 5.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "21/35",
          "temp": "21.2\u00b0C",
          "power": "1.0 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg-107",
          "name": "PG-107",
          "x": 107.5,
          "z": 11.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "22/35",
          "temp": "21.2\u00b0C",
          "power": "1.0 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg-108",
          "name": "PG-108",
          "x": 107.5,
          "z": 17.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "23/35",
          "temp": "21.2\u00b0C",
          "power": "1.0 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg-109",
          "name": "PG-109",
          "x": 91.5,
          "z": -6.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "28/35",
          "temp": "21.8\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg-110",
          "name": "PG-110",
          "x": 98.5,
          "z": -6.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "28/35",
          "temp": "21.8\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg-111",
          "name": "PG-111",
          "x": 82.5,
          "z": 26.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "18/35",
          "temp": "21.0\u00b0C",
          "power": "0.9 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg-112",
          "name": "PG-112",
          "x": 107.5,
          "z": 26.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "18/35",
          "temp": "21.0\u00b0C",
          "power": "0.9 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg_lab_f2",
          "name": "PG Research Lab 1",
          "x": 95.0,
          "z": 27.5,
          "w": 8.0,
          "h": 4.0,
          "d": 6.0,
          "status": "SECURE",
          "occupancy": "40/60",
          "temp": "21.5\u00b0C",
          "power": "3.5 kW",
          "hvac": "NOMINAL",
          "desc": "PG Block FLR 2 main facility space."
        },
        {
          "id": "pg-113",
          "name": "PG-113",
          "x": 82.5,
          "z": 33.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "28/40",
          "temp": "21.6\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg-114",
          "name": "PG-114",
          "x": 107.5,
          "z": 33.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "32/40",
          "temp": "22.1\u00b0C",
          "power": "1.3 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg-115",
          "name": "PG-115",
          "x": 82.5,
          "z": 46.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "20/40",
          "temp": "21.4\u00b0C",
          "power": "1.0 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg-116",
          "name": "PG-116",
          "x": 91.5,
          "z": 46.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "26/40",
          "temp": "21.9\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg-117",
          "name": "PG-117",
          "x": 98.5,
          "z": 46.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "27/40",
          "temp": "21.6\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg-118",
          "name": "PG-118",
          "x": 107.5,
          "z": 46.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "31/40",
          "temp": "22.1\u00b0C",
          "power": "1.3 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d_balcony_f2",
          "name": "D Garden Balcony (FLR 2)",
          "x": 95.0,
          "z": -75.0,
          "w": 15.0,
          "h": 0.2,
          "d": 18.0,
          "status": "SECURE",
          "occupancy": "2/10",
          "temp": "22.0\u00b0C",
          "power": "0.3 kW",
          "desc": "Floor 2 interior perimeter balcony overlooking D Central Garden."
        },
        {
          "id": "d_lab_f2",
          "name": "D Research Lab 1",
          "x": 95.0,
          "z": -92.5,
          "w": 8.0,
          "h": 3.5,
          "d": 6.0,
          "status": "SECURE",
          "occupancy": "18/30",
          "temp": "21.5\u00b0C",
          "power": "1.8 kW",
          "desc": "D Block FLR 2 main facility space."
        },
        {
          "id": "d-101",
          "name": "D-101",
          "x": 82.5,
          "z": -64.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "20/40",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d-102",
          "name": "D-102",
          "x": 82.5,
          "z": -70.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "22/40",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d-103",
          "name": "D-103",
          "x": 82.5,
          "z": -76.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "24/40",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d-104",
          "name": "D-104",
          "x": 82.5,
          "z": -82.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "26/40",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d-111",
          "name": "D-111",
          "x": 82.5,
          "z": -88.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "28/40",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d-113",
          "name": "D-113",
          "x": 82.5,
          "z": -94.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "30/40",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d-105",
          "name": "D-105",
          "x": 107.5,
          "z": -64.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "22/40",
          "temp": "21.8\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d-106",
          "name": "D-106",
          "x": 107.5,
          "z": -70.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "24/40",
          "temp": "21.8\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d-107",
          "name": "D-107",
          "x": 107.5,
          "z": -76.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "26/40",
          "temp": "21.8\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d-108",
          "name": "D-108",
          "x": 107.5,
          "z": -82.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "28/40",
          "temp": "21.8\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d-112",
          "name": "D-112",
          "x": 107.5,
          "z": -88.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "30/40",
          "temp": "21.8\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d-114",
          "name": "D-114",
          "x": 107.5,
          "z": -94.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "32/40",
          "temp": "21.8\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d-115",
          "name": "D-115",
          "x": 82.5,
          "z": -48.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "24/40",
          "temp": "21.4\u00b0C",
          "power": "1.0 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d-116",
          "name": "D-116",
          "x": 91.5,
          "z": -48.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "28/40",
          "temp": "21.9\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d-117",
          "name": "D-117",
          "x": 98.5,
          "z": -48.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "29/40",
          "temp": "21.7\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d-118",
          "name": "D-118",
          "x": 107.5,
          "z": -48.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "32/40",
          "temp": "22.1\u00b0C",
          "power": "1.3 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d-109",
          "name": "D-109",
          "x": 91.5,
          "z": -101.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "15/40",
          "temp": "21.0\u00b0C",
          "power": "0.9 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d-110",
          "name": "D-110",
          "x": 98.5,
          "z": -101.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "18/40",
          "temp": "21.2\u00b0C",
          "power": "1.0 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e_balcony_f2",
          "name": "D Garden Balcony (FLR 2)",
          "x": -75.0,
          "z": -75.0,
          "w": 15.0,
          "h": 0.2,
          "d": 18.0,
          "status": "SECURE",
          "occupancy": "2/10",
          "temp": "22.0\u00b0C",
          "power": "0.3 kW",
          "desc": "Floor 2 interior perimeter balcony overlooking D Central Garden."
        },
        {
          "id": "e_lab_f2",
          "name": "D Research Lab 1",
          "x": -75.0,
          "z": -92.5,
          "w": 8.0,
          "h": 3.5,
          "d": 6.0,
          "status": "SECURE",
          "occupancy": "18/30",
          "temp": "21.5\u00b0C",
          "power": "1.8 kW",
          "desc": "E Block FLR 2 main facility space."
        },
        {
          "id": "e-101",
          "name": "E-101",
          "x": -87.5,
          "z": -64.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "20/40",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e-102",
          "name": "E-102",
          "x": -87.5,
          "z": -70.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "22/40",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e-103",
          "name": "E-103",
          "x": -87.5,
          "z": -76.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "24/40",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e-104",
          "name": "E-104",
          "x": -87.5,
          "z": -82.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "26/40",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e-111",
          "name": "E-111",
          "x": -87.5,
          "z": -88.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "28/40",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e-113",
          "name": "E-113",
          "x": -87.5,
          "z": -94.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "30/40",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e-105",
          "name": "E-105",
          "x": -62.5,
          "z": -64.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "22/40",
          "temp": "21.8\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e-106",
          "name": "E-106",
          "x": -62.5,
          "z": -70.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "24/40",
          "temp": "21.8\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e-107",
          "name": "E-107",
          "x": -62.5,
          "z": -76.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "26/40",
          "temp": "21.8\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e-108",
          "name": "E-108",
          "x": -62.5,
          "z": -82.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "28/40",
          "temp": "21.8\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e-112",
          "name": "E-112",
          "x": -62.5,
          "z": -88.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "30/40",
          "temp": "21.8\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e-114",
          "name": "E-114",
          "x": -62.5,
          "z": -94.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "32/40",
          "temp": "21.8\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e-115",
          "name": "E-115",
          "x": -87.5,
          "z": -48.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "24/40",
          "temp": "21.4\u00b0C",
          "power": "1.0 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e-116",
          "name": "E-116",
          "x": -78.5,
          "z": -48.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "28/40",
          "temp": "21.9\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e-117",
          "name": "E-117",
          "x": -71.5,
          "z": -48.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "29/40",
          "temp": "21.7\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e-118",
          "name": "E-118",
          "x": -62.5,
          "z": -48.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "32/40",
          "temp": "22.1\u00b0C",
          "power": "1.3 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e-109",
          "name": "E-109",
          "x": -78.5,
          "z": -101.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "15/40",
          "temp": "21.0\u00b0C",
          "power": "0.9 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e-110",
          "name": "E-110",
          "x": -71.5,
          "z": -101.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "18/40",
          "temp": "21.2\u00b0C",
          "power": "1.0 kW",
          "hvac": "NOMINAL"
        }
      ],
      "connectors": [
        {
          "id": "Main_to_PG_Skybridge",
          "name": "Main to PG Skybridge",
          "type": "skybridge",
          "x": 64.25,
          "z": 40.0,
          "w": 49.5,
          "h": 3.2,
          "d": 4.5,
          "start": {
            "x": 39.5,
            "z": 40.0
          },
          "target": {
            "x": 89.0,
            "z": 40.0
          }
        }
      ],
      "staircases": [
        {
          "id": "Internal_V_Staircase",
          "name": "Internal V-Shaped Staircase",
          "x": 0,
          "z": -20.0,
          "height": 8.0,
          "type": "v_switchback",
          "connects": [
            "FLR 1",
            "FLR 2"
          ],
          "from": "Ground Floor Corridor (between Stationery & SSC)",
          "to": "FLR 2 Corridor (left of Accounts Section)"
        },
        {
          "id": "staircase-central-tower",
          "name": "Central Tower Staircase",
          "x": -42.0,
          "z": 20.0,
          "height": 32.0
        },
        {
          "id": "staircase-rattaiah",
          "name": "Rattaiah Staircase",
          "x": 39.5,
          "z": 35.0,
          "height": 8.0
        },
        {
          "id": "staircase-pg-internal",
          "name": "PG Internal V-Staircase",
          "x": 95.0,
          "z": 21.0,
          "height": 8.0,
          "type": "v_switchback",
          "connects": [
            "FLR 2",
            "FLR 3"
          ],
          "from": "PG FLR 2 Corridor",
          "to": "PG FLR 3 Corridor"
        },
        {
          "id": "staircase-d-internal",
          "name": "D Internal V-Staircase",
          "x": 95.0,
          "z": -75.0,
          "w": 4.0,
          "h": 4.0,
          "d": 4.0,
          "type": "Internal_V_Staircase",
          "from": "D FLR 2 Corridor",
          "to": "D FLR 3 Corridor"
        }
      ]
    },
    {
      "id": 3,
      "name": "Floor 3 (2nd Floor)",
      "elevation": 16.0,
      "corridors": [
        {
          "x": 0,
          "z": -20.0,
          "w": 5.0,
          "h": 0.2,
          "d": 35.0
        },
        {
          "x": -21.0,
          "z": -20.0,
          "w": 42.0,
          "h": 0.2,
          "d": 4.5
        },
        {
          "x": -42.0,
          "z": 10.0,
          "w": 4.5,
          "h": 0.2,
          "d": 60.0
        },
        {
          "x": -1.25,
          "z": 40.0,
          "w": 81.5,
          "h": 0.2,
          "d": 4.5
        },
        {
          "x": -16.0,
          "z": 10.0,
          "w": 4.5,
          "h": 0.2,
          "d": 60.0
        },
        {
          "x": 23.5,
          "z": -20.0,
          "w": 32.0,
          "h": 0.2,
          "d": 4.5
        },
        {
          "x": 7.5,
          "z": 12.5,
          "w": 4.5,
          "h": 0.2,
          "d": 60.0
        },
        {
          "x": 39.5,
          "z": 10.0,
          "w": 4.5,
          "h": 0.2,
          "d": 60.0
        },
        {
          "x": 89.0,
          "z": 19.5,
          "w": 4.5,
          "h": 0.2,
          "d": 45.5
        },
        {
          "x": 101.0,
          "z": 19.5,
          "w": 4.5,
          "h": 0.2,
          "d": 45.5
        },
        {
          "x": 95.0,
          "z": -1.0,
          "w": 16.5,
          "h": 0.2,
          "d": 4.5
        },
        {
          "x": 95.0,
          "z": 21.0,
          "w": 16.5,
          "h": 0.2,
          "d": 4.5
        },
        {
          "x": 95.0,
          "z": 40.0,
          "w": 16.5,
          "h": 0.2,
          "d": 4.5
        },
        {
          "x": 89.0,
          "z": -72.5,
          "w": 4.5,
          "h": 0.2,
          "d": 45.5
        },
        {
          "x": 101.0,
          "z": -72.5,
          "w": 4.5,
          "h": 0.2,
          "d": 45.5
        },
        {
          "x": 95.0,
          "z": -55.0,
          "w": 16.5,
          "h": 0.2,
          "d": 4.5
        },
        {
          "x": 95.0,
          "z": -74.0,
          "w": 16.5,
          "h": 0.2,
          "d": 4.5
        },
        {
          "x": 95.0,
          "z": -96.0,
          "w": 16.5,
          "h": 0.2,
          "d": 4.5
        },
        {
          "x": -81.0,
          "z": -72.5,
          "w": 4.5,
          "h": 0.2,
          "d": 45.5
        },
        {
          "x": -69.0,
          "z": -72.5,
          "w": 4.5,
          "h": 0.2,
          "d": 45.5
        },
        {
          "x": -75.0,
          "z": -55.0,
          "w": 16.5,
          "h": 0.2,
          "d": 4.5
        },
        {
          "x": -75.0,
          "z": -74.0,
          "w": 16.5,
          "h": 0.2,
          "d": 4.5
        },
        {
          "x": -75.0,
          "z": -96.0,
          "w": 16.5,
          "h": 0.2,
          "d": 4.5
        }
      ],
      "rooms": [
        {
          "id": "accounts-f3",
          "name": "Accounts Section (FLR 3)",
          "x": -12.5,
          "z": -24.5,
          "w": 6.0,
          "h": 3.5,
          "d": 5.0,
          "status": "SECURE",
          "occupancy": "12/15",
          "temp": "21.5\u00b0C",
          "power": "0.6 kW",
          "hvac": "NOMINAL",
          "desc": "Accounts and payroll office."
        },
        {
          "id": "panda_punnaiah_square_f3",
          "name": "Panda Punnaiah Square (FLR 3)",
          "x": -32.875,
          "z": 10.125,
          "w": 20.25,
          "h": 0.05,
          "d": 55.25,
          "status": "GARDEN",
          "desc": "Panda Punnaiah Square elevated garden courtyard."
        },
        {
          "id": "library-f3",
          "name": "Library (FLR 3)",
          "x": -47.5,
          "z": 13.5,
          "w": 9.0,
          "h": 5.0,
          "d": 26.0,
          "status": "SECURE",
          "occupancy": "85/150",
          "temp": "21.0\u00b0C",
          "power": "2.4 kW",
          "hvac": "NOMINAL",
          "desc": "Massive Floor 2 campus library spanning above the Auditorium."
        },
        {
          "id": "workshop-1-f3",
          "name": "Workshop 1",
          "x": -35.0,
          "z": 44.5,
          "w": 5.5,
          "h": 3.5,
          "d": 6.0,
          "status": "SECURE",
          "desc": "Floor 2 CS workshop."
        },
        {
          "id": "workshop-2-f3",
          "name": "Workshop 2",
          "x": -28.0,
          "z": 44.5,
          "w": 5.5,
          "h": 3.5,
          "d": 6.0,
          "status": "SECURE",
          "desc": "Floor 2 electronics workshop."
        },
        {
          "id": "washroom-1a-f3",
          "name": "Washroom 1A",
          "x": -9.0,
          "z": 44.5,
          "w": 4.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "1/5",
          "temp": "20.1\u00b0C",
          "power": "0.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "washroom-1b-f3",
          "name": "Washroom 1B",
          "x": -4.0,
          "z": 44.5,
          "w": 4.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "2/5",
          "temp": "20.4\u00b0C",
          "power": "0.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-201",
          "name": "B-201",
          "x": -20.5,
          "z": -10.0,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "30/40",
          "temp": "21.5\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-202",
          "name": "B-202",
          "x": -20.5,
          "z": -5.0,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "28/40",
          "temp": "21.6\u00b0C",
          "power": "1.0 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-203",
          "name": "B-203",
          "x": -20.5,
          "z": 0.0,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "35/40",
          "temp": "22.0\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-204",
          "name": "B-204",
          "x": -20.5,
          "z": 5.0,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "0/40",
          "temp": "19.5\u00b0C",
          "power": "0.1 kW",
          "hvac": "STANDBY"
        },
        {
          "id": "b-205",
          "name": "B-205",
          "x": -20.5,
          "z": 10.0,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "25/40",
          "temp": "21.8\u00b0C",
          "power": "0.9 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-206",
          "name": "B-206",
          "x": -20.5,
          "z": 15.0,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "33/40",
          "temp": "22.2\u00b0C",
          "power": "1.4 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-207",
          "name": "B-207",
          "x": -20.5,
          "z": 20.0,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "MAINTENANCE",
          "occupancy": "0/0",
          "temp": "18.0\u00b0C",
          "power": "0.0 kW",
          "hvac": "OFF"
        },
        {
          "id": "b-208",
          "name": "B-208",
          "x": -20.5,
          "z": 25.0,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "20/40",
          "temp": "21.1\u00b0C",
          "power": "0.8 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-209",
          "name": "B-209",
          "x": -20.5,
          "z": 30.0,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "14/40",
          "temp": "20.8\u00b0C",
          "power": "0.7 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-210",
          "name": "B-210",
          "x": -20.5,
          "z": 35.0,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "24/40",
          "temp": "21.0\u00b0C",
          "power": "0.9 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "rattaiah_square_f3",
          "name": "Rattaiah Square Balcony (FLR 3)",
          "x": 26.125,
          "z": 7.75,
          "w": 22.25,
          "h": 0.05,
          "d": 60.0,
          "status": "GARDEN",
          "desc": "Floor 2 open-air balcony overlooking Rattaiah Square."
        },
        {
          "id": "b-220",
          "name": "B-220",
          "x": 15,
          "z": -24.5,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "35/40",
          "temp": "22.0\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-219",
          "name": "B-219",
          "x": 20,
          "z": -24.5,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "28/40",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-218",
          "name": "B-218",
          "x": 25,
          "z": -24.5,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "WARNING",
          "occupancy": "38/40",
          "temp": "24.5\u00b0C",
          "power": "2.8 kW",
          "hvac": "OVERLOAD"
        },
        {
          "id": "b-217",
          "name": "B-217",
          "x": 30,
          "z": -24.5,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "0/40",
          "temp": "19.5\u00b0C",
          "power": "0.1 kW",
          "hvac": "STANDBY"
        },
        {
          "id": "b-216",
          "name": "B-216",
          "x": 35,
          "z": -24.5,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "15/40",
          "temp": "21.1\u00b0C",
          "power": "0.8 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-221",
          "name": "B-221",
          "x": 44.0,
          "z": -12.25,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "30/40",
          "temp": "21.6\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-222",
          "name": "B-222",
          "x": 44.0,
          "z": -2.25,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "22/40",
          "temp": "22.0\u00b0C",
          "power": "1.3 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-223",
          "name": "B-223",
          "x": 44.0,
          "z": 7.75,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "26/40",
          "temp": "21.4\u00b0C",
          "power": "1.0 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "lab-3c",
          "name": "Lab 3B",
          "x": 44.75,
          "z": 18.5,
          "w": 6.0,
          "h": 3.5,
          "d": 6.0,
          "status": "SECURE",
          "desc": "Floor 3 lab space."
        },
        {
          "id": "lab-4c",
          "name": "Lab 4B",
          "x": 44.75,
          "z": 30.0,
          "w": 6.0,
          "h": 3.5,
          "d": 6.0,
          "status": "SECURE",
          "desc": "Floor 3 lab space."
        },
        {
          "id": "lab-2b",
          "name": "Lab 1B",
          "x": 32.75,
          "z": 44.5,
          "w": 5.5,
          "h": 3.5,
          "d": 6.0,
          "status": "SECURE",
          "desc": "Floor 2 computer science lab."
        },
        {
          "id": "lab-2c",
          "name": "Lab 2B",
          "x": 25.75,
          "z": 44.5,
          "w": 5.5,
          "h": 3.5,
          "d": 6.0,
          "status": "SECURE",
          "desc": "Floor 3 lab space."
        },
        {
          "id": "b-224",
          "name": "B-224",
          "x": 19.25,
          "z": 44.5,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "18/40",
          "temp": "21.1\u00b0C",
          "power": "0.9 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-225",
          "name": "B-225",
          "x": 13.25,
          "z": 44.5,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "0/40",
          "temp": "19.8\u00b0C",
          "power": "0.2 kW",
          "hvac": "STANDBY"
        },
        {
          "id": "b-211",
          "name": "B-211",
          "x": 12.5,
          "z": -10,
          "w": 5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "30/40",
          "temp": "22.2\u00b0C",
          "power": "1.4 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-212",
          "name": "B-212",
          "x": 12.5,
          "z": -5,
          "w": 5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "35/40",
          "temp": "21.9\u00b0C",
          "power": "1.3 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-213",
          "name": "B-213",
          "x": 12.5,
          "z": 0,
          "w": 5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "24/40",
          "temp": "21.0\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-214",
          "name": "B-214",
          "x": 12.5,
          "z": 5,
          "w": 5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "31/40",
          "temp": "22.1\u00b0C",
          "power": "1.4 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-215",
          "name": "B-215",
          "x": 12.5,
          "z": 10,
          "w": 5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "18/40",
          "temp": "20.9\u00b0C",
          "power": "0.9 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-216-c",
          "name": "B-216",
          "x": 12.5,
          "z": 15,
          "w": 5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "22/40",
          "temp": "21.4\u00b0C",
          "power": "1.0 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-217-c",
          "name": "B-217",
          "x": 12.5,
          "z": 20,
          "w": 5,
          "h": 3.5,
          "d": 4.5,
          "status": "MAINTENANCE",
          "occupancy": "0/0",
          "temp": "18.0\u00b0C",
          "power": "0.0 kW",
          "hvac": "OFF"
        },
        {
          "id": "b-218-c",
          "name": "B-218",
          "x": 12.5,
          "z": 25,
          "w": 5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "27/40",
          "temp": "21.7\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-219-c",
          "name": "B-219",
          "x": 12.5,
          "z": 30,
          "w": 5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "14/40",
          "temp": "20.8\u00b0C",
          "power": "0.7 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-220-c",
          "name": "B-220",
          "x": 12.5,
          "z": 35,
          "w": 5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "20/40",
          "temp": "21.0\u00b0C",
          "power": "0.9 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-226",
          "name": "B-226",
          "x": 7.0,
          "z": 44.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "32/40",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-227",
          "name": "B-227",
          "x": 1.5,
          "z": 44.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "28/40",
          "temp": "21.8\u00b0C",
          "power": "1.0 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg_balcony_f3",
          "name": "PG Garden Balcony (FLR 3)",
          "x": 95.0,
          "z": 10.0,
          "w": 15.0,
          "h": 0.05,
          "d": 18.0,
          "status": "GARDEN",
          "desc": "Floor 3 interior perimeter balcony overlooking PG Central Garden."
        },
        {
          "id": "pg-201",
          "name": "PG-201",
          "x": 82.5,
          "z": -1.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "21/35",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg-202",
          "name": "PG-202",
          "x": 82.5,
          "z": 5.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "22/35",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg-203",
          "name": "PG-203",
          "x": 82.5,
          "z": 11.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "23/35",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg-204",
          "name": "PG-204",
          "x": 82.5,
          "z": 17.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "24/35",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg-205",
          "name": "PG-205",
          "x": 107.5,
          "z": -1.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "20/35",
          "temp": "21.2\u00b0C",
          "power": "1.0 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg-206",
          "name": "PG-206",
          "x": 107.5,
          "z": 5.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "21/35",
          "temp": "21.2\u00b0C",
          "power": "1.0 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg-207",
          "name": "PG-207",
          "x": 107.5,
          "z": 11.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "22/35",
          "temp": "21.2\u00b0C",
          "power": "1.0 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg-208",
          "name": "PG-208",
          "x": 107.5,
          "z": 17.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "23/35",
          "temp": "21.2\u00b0C",
          "power": "1.0 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg-209",
          "name": "PG-209",
          "x": 91.5,
          "z": -6.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "28/35",
          "temp": "21.8\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg-210",
          "name": "PG-210",
          "x": 98.5,
          "z": -6.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "28/35",
          "temp": "21.8\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg-211",
          "name": "PG-211",
          "x": 82.5,
          "z": 26.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "18/35",
          "temp": "21.0\u00b0C",
          "power": "0.9 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg-212",
          "name": "PG-212",
          "x": 107.5,
          "z": 26.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "18/35",
          "temp": "21.0\u00b0C",
          "power": "0.9 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg_lab_f3",
          "name": "PG Research Lab 2",
          "x": 95.0,
          "z": 27.5,
          "w": 8.0,
          "h": 4.0,
          "d": 6.0,
          "status": "SECURE",
          "occupancy": "40/60",
          "temp": "21.5\u00b0C",
          "power": "3.5 kW",
          "hvac": "NOMINAL",
          "desc": "PG Block FLR 3 main facility space."
        },
        {
          "id": "pg-213",
          "name": "PG-213",
          "x": 82.5,
          "z": 33.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "31/40",
          "temp": "21.7\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg-214",
          "name": "PG-214",
          "x": 107.5,
          "z": 33.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "34/40",
          "temp": "22.3\u00b0C",
          "power": "1.4 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg-215",
          "name": "PG-215",
          "x": 82.5,
          "z": 46.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "24/40",
          "temp": "21.3\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg-216",
          "name": "PG-216",
          "x": 91.5,
          "z": 46.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "29/40",
          "temp": "22.0\u00b0C",
          "power": "1.3 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg-217",
          "name": "PG-217",
          "x": 98.5,
          "z": 46.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "30/40",
          "temp": "21.7\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg-218",
          "name": "PG-218",
          "x": 107.5,
          "z": 46.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "33/40",
          "temp": "22.2\u00b0C",
          "power": "1.4 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d_balcony_f3",
          "name": "D Garden Balcony (FLR 3)",
          "x": 95.0,
          "z": -75.0,
          "w": 15.0,
          "h": 0.2,
          "d": 18.0,
          "status": "SECURE",
          "occupancy": "2/10",
          "temp": "22.0\u00b0C",
          "power": "0.3 kW",
          "desc": "Floor 3 interior perimeter balcony overlooking D Central Garden."
        },
        {
          "id": "d_lab_f3",
          "name": "D Research Lab 2",
          "x": 95.0,
          "z": -92.5,
          "w": 8.0,
          "h": 3.5,
          "d": 6.0,
          "status": "SECURE",
          "occupancy": "18/30",
          "temp": "21.5\u00b0C",
          "power": "1.8 kW",
          "desc": "D Block FLR 3 main facility space."
        },
        {
          "id": "d-201",
          "name": "D-201",
          "x": 82.5,
          "z": -64.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "20/40",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d-202",
          "name": "D-202",
          "x": 82.5,
          "z": -70.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "22/40",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d-203",
          "name": "D-203",
          "x": 82.5,
          "z": -76.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "24/40",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d-204",
          "name": "D-204",
          "x": 82.5,
          "z": -82.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "26/40",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d-211",
          "name": "D-211",
          "x": 82.5,
          "z": -88.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "28/40",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d-213",
          "name": "D-213",
          "x": 82.5,
          "z": -94.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "30/40",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d-205",
          "name": "D-205",
          "x": 107.5,
          "z": -64.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "22/40",
          "temp": "21.8\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d-206",
          "name": "D-206",
          "x": 107.5,
          "z": -70.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "24/40",
          "temp": "21.8\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d-207",
          "name": "D-207",
          "x": 107.5,
          "z": -76.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "26/40",
          "temp": "21.8\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d-208",
          "name": "D-208",
          "x": 107.5,
          "z": -82.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "28/40",
          "temp": "21.8\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d-212",
          "name": "D-212",
          "x": 107.5,
          "z": -88.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "30/40",
          "temp": "21.8\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d-214",
          "name": "D-214",
          "x": 107.5,
          "z": -94.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "32/40",
          "temp": "21.8\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d-215",
          "name": "D-215",
          "x": 82.5,
          "z": -48.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "24/40",
          "temp": "21.4\u00b0C",
          "power": "1.0 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d-216",
          "name": "D-216",
          "x": 91.5,
          "z": -48.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "28/40",
          "temp": "21.9\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d-217",
          "name": "D-217",
          "x": 98.5,
          "z": -48.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "29/40",
          "temp": "21.7\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d-218",
          "name": "D-218",
          "x": 107.5,
          "z": -48.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "32/40",
          "temp": "22.1\u00b0C",
          "power": "1.3 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d-209",
          "name": "D-209",
          "x": 91.5,
          "z": -101.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "15/40",
          "temp": "21.0\u00b0C",
          "power": "0.9 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d-210",
          "name": "D-210",
          "x": 98.5,
          "z": -101.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "18/40",
          "temp": "21.2\u00b0C",
          "power": "1.0 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e_balcony_f3",
          "name": "D Garden Balcony (FLR 3)",
          "x": -75.0,
          "z": -75.0,
          "w": 15.0,
          "h": 0.2,
          "d": 18.0,
          "status": "SECURE",
          "occupancy": "2/10",
          "temp": "22.0\u00b0C",
          "power": "0.3 kW",
          "desc": "Floor 3 interior perimeter balcony overlooking D Central Garden."
        },
        {
          "id": "e_lab_f3",
          "name": "D Research Lab 2",
          "x": -75.0,
          "z": -92.5,
          "w": 8.0,
          "h": 3.5,
          "d": 6.0,
          "status": "SECURE",
          "occupancy": "18/30",
          "temp": "21.5\u00b0C",
          "power": "1.8 kW",
          "desc": "E Block FLR 3 main facility space."
        },
        {
          "id": "e-201",
          "name": "E-201",
          "x": -87.5,
          "z": -64.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "20/40",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e-202",
          "name": "E-202",
          "x": -87.5,
          "z": -70.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "22/40",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e-203",
          "name": "E-203",
          "x": -87.5,
          "z": -76.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "24/40",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e-204",
          "name": "E-204",
          "x": -87.5,
          "z": -82.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "26/40",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e-211",
          "name": "E-211",
          "x": -87.5,
          "z": -88.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "28/40",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e-213",
          "name": "E-213",
          "x": -87.5,
          "z": -94.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "30/40",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e-205",
          "name": "E-205",
          "x": -62.5,
          "z": -64.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "22/40",
          "temp": "21.8\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e-206",
          "name": "E-206",
          "x": -62.5,
          "z": -70.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "24/40",
          "temp": "21.8\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e-207",
          "name": "E-207",
          "x": -62.5,
          "z": -76.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "26/40",
          "temp": "21.8\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e-208",
          "name": "E-208",
          "x": -62.5,
          "z": -82.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "28/40",
          "temp": "21.8\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e-212",
          "name": "E-212",
          "x": -62.5,
          "z": -88.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "30/40",
          "temp": "21.8\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e-214",
          "name": "E-214",
          "x": -62.5,
          "z": -94.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "32/40",
          "temp": "21.8\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e-215",
          "name": "E-215",
          "x": -87.5,
          "z": -48.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "24/40",
          "temp": "21.4\u00b0C",
          "power": "1.0 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e-216",
          "name": "E-216",
          "x": -78.5,
          "z": -48.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "28/40",
          "temp": "21.9\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e-217",
          "name": "E-217",
          "x": -71.5,
          "z": -48.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "29/40",
          "temp": "21.7\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e-218",
          "name": "E-218",
          "x": -62.5,
          "z": -48.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "32/40",
          "temp": "22.1\u00b0C",
          "power": "1.3 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e-209",
          "name": "E-209",
          "x": -78.5,
          "z": -101.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "15/40",
          "temp": "21.0\u00b0C",
          "power": "0.9 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e-210",
          "name": "E-210",
          "x": -71.5,
          "z": -101.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "18/40",
          "temp": "21.2\u00b0C",
          "power": "1.0 kW",
          "hvac": "NOMINAL"
        }
      ],
      "connectors": [
        {
          "id": "Main_to_PG_Skybridge",
          "name": "Main to PG Skybridge",
          "type": "skybridge",
          "x": 64.25,
          "z": 40.0,
          "w": 49.5,
          "h": 3.2,
          "d": 4.5,
          "start": {
            "x": 39.5,
            "z": 40.0
          },
          "target": {
            "x": 89.0,
            "z": 40.0
          }
        }
      ],
      "staircases": [
        {
          "id": "Internal_V_Staircase",
          "name": "Internal V-Shaped Staircase",
          "x": 0.0,
          "z": -20.0,
          "height": 8.0,
          "type": "v_switchback",
          "connects": [
            "FLR 2",
            "FLR 3"
          ],
          "from": "FLR 2 Corridor",
          "to": "FLR 3 Corridor"
        },
        {
          "id": "staircase-central-tower",
          "name": "Central Tower Staircase",
          "x": -42.0,
          "z": 20.0,
          "height": 32.0
        },
        {
          "id": "staircase-rattaiah",
          "name": "Rattaiah Staircase",
          "x": 39.5,
          "z": 35.0,
          "height": 8.0
        },
        {
          "id": "staircase-pg-internal",
          "name": "PG Internal V-Staircase",
          "x": 95.0,
          "z": 21.0,
          "height": 8.0,
          "type": "v_switchback",
          "connects": [
            "FLR 3",
            "FLR 4"
          ],
          "from": "PG FLR 3 Corridor",
          "to": "PG FLR 4 Corridor"
        },
        {
          "id": "staircase-d-internal",
          "name": "D Internal V-Staircase",
          "x": 95.0,
          "z": -75.0,
          "w": 4.0,
          "h": 4.0,
          "d": 4.0,
          "type": "Internal_V_Staircase",
          "from": "D FLR 3 Corridor",
          "to": "D FLR 4 Corridor"
        }
      ]
    },
    {
      "id": 4,
      "name": "Floor 4 (3rd Floor)",
      "elevation": 24.0,
      "corridors": [
        {
          "x": 0,
          "z": -20.0,
          "w": 5.0,
          "h": 0.2,
          "d": 35.0
        },
        {
          "x": -21.0,
          "z": -20.0,
          "w": 42.0,
          "h": 0.2,
          "d": 4.5
        },
        {
          "x": -42.0,
          "z": 10.0,
          "w": 4.5,
          "h": 0.2,
          "d": 60.0
        },
        {
          "x": -1.25,
          "z": 40.0,
          "w": 81.5,
          "h": 0.2,
          "d": 4.5
        },
        {
          "x": -16.0,
          "z": 10.0,
          "w": 4.5,
          "h": 0.2,
          "d": 60.0
        },
        {
          "x": 23.5,
          "z": -20.0,
          "w": 32.0,
          "h": 0.2,
          "d": 4.5
        },
        {
          "x": 7.5,
          "z": 12.5,
          "w": 4.5,
          "h": 0.2,
          "d": 60.0
        },
        {
          "x": 39.5,
          "z": 10.0,
          "w": 4.5,
          "h": 0.2,
          "d": 60.0
        },
        {
          "x": 89.0,
          "z": 19.5,
          "w": 4.5,
          "h": 0.2,
          "d": 45.5
        },
        {
          "x": 101.0,
          "z": 19.5,
          "w": 4.5,
          "h": 0.2,
          "d": 45.5
        },
        {
          "x": 95.0,
          "z": -1.0,
          "w": 16.5,
          "h": 0.2,
          "d": 4.5
        },
        {
          "x": 95.0,
          "z": 21.0,
          "w": 16.5,
          "h": 0.2,
          "d": 4.5
        },
        {
          "x": 95.0,
          "z": 40.0,
          "w": 16.5,
          "h": 0.2,
          "d": 4.5
        },
        {
          "x": 89.0,
          "z": -72.5,
          "w": 4.5,
          "h": 0.2,
          "d": 45.5
        },
        {
          "x": 101.0,
          "z": -72.5,
          "w": 4.5,
          "h": 0.2,
          "d": 45.5
        },
        {
          "x": 95.0,
          "z": -55.0,
          "w": 16.5,
          "h": 0.2,
          "d": 4.5
        },
        {
          "x": 95.0,
          "z": -74.0,
          "w": 16.5,
          "h": 0.2,
          "d": 4.5
        },
        {
          "x": 95.0,
          "z": -96.0,
          "w": 16.5,
          "h": 0.2,
          "d": 4.5
        },
        {
          "x": -81.0,
          "z": -72.5,
          "w": 4.5,
          "h": 0.2,
          "d": 45.5
        },
        {
          "x": -69.0,
          "z": -72.5,
          "w": 4.5,
          "h": 0.2,
          "d": 45.5
        },
        {
          "x": -75.0,
          "z": -55.0,
          "w": 16.5,
          "h": 0.2,
          "d": 4.5
        },
        {
          "x": -75.0,
          "z": -74.0,
          "w": 16.5,
          "h": 0.2,
          "d": 4.5
        },
        {
          "x": -75.0,
          "z": -96.0,
          "w": 16.5,
          "h": 0.2,
          "d": 4.5
        }
      ],
      "rooms": [
        {
          "id": "accounts-f4",
          "name": "Accounts Section (FLR 4)",
          "x": -12.5,
          "z": -24.5,
          "w": 6.0,
          "h": 3.5,
          "d": 5.0,
          "status": "SECURE",
          "occupancy": "12/15",
          "temp": "21.5\u00b0C",
          "power": "0.6 kW",
          "hvac": "NOMINAL",
          "desc": "Accounts and payroll office."
        },
        {
          "id": "panda_punnaiah_square_f4",
          "name": "Panda Punnaiah Square (FLR 4)",
          "x": -32.875,
          "z": 10.125,
          "w": 20.25,
          "h": 0.05,
          "d": 55.25,
          "status": "GARDEN",
          "desc": "Panda Punnaiah Square elevated garden courtyard."
        },
        {
          "id": "library-f4",
          "name": "Library (FLR 4)",
          "x": -47.5,
          "z": 13.5,
          "w": 9.0,
          "h": 5.0,
          "d": 26.0,
          "status": "SECURE",
          "occupancy": "85/150",
          "temp": "21.0\u00b0C",
          "power": "2.4 kW",
          "hvac": "NOMINAL",
          "desc": "Massive Floor 2 campus library spanning above the Auditorium."
        },
        {
          "id": "workshop-1-f4",
          "name": "Workshop 1",
          "x": -35.0,
          "z": 44.5,
          "w": 5.5,
          "h": 3.5,
          "d": 6.0,
          "status": "SECURE",
          "desc": "Floor 2 CS workshop."
        },
        {
          "id": "workshop-2-f4",
          "name": "Workshop 2",
          "x": -28.0,
          "z": 44.5,
          "w": 5.5,
          "h": 3.5,
          "d": 6.0,
          "status": "SECURE",
          "desc": "Floor 2 electronics workshop."
        },
        {
          "id": "washroom-1a-f4",
          "name": "Washroom 1A",
          "x": -9.0,
          "z": 44.5,
          "w": 4.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "1/5",
          "temp": "20.1\u00b0C",
          "power": "0.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "washroom-1b-f4",
          "name": "Washroom 1B",
          "x": -4.0,
          "z": 44.5,
          "w": 4.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "2/5",
          "temp": "20.4\u00b0C",
          "power": "0.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-301",
          "name": "B-301",
          "x": -20.5,
          "z": -10.0,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "30/40",
          "temp": "21.5\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-302",
          "name": "B-302",
          "x": -20.5,
          "z": -5.0,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "28/40",
          "temp": "21.6\u00b0C",
          "power": "1.0 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-303",
          "name": "B-303",
          "x": -20.5,
          "z": 0.0,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "35/40",
          "temp": "22.0\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-304",
          "name": "B-304",
          "x": -20.5,
          "z": 5.0,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "0/40",
          "temp": "19.5\u00b0C",
          "power": "0.1 kW",
          "hvac": "STANDBY"
        },
        {
          "id": "b-305",
          "name": "B-305",
          "x": -20.5,
          "z": 10.0,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "25/40",
          "temp": "21.8\u00b0C",
          "power": "0.9 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-306",
          "name": "B-306",
          "x": -20.5,
          "z": 15.0,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "33/40",
          "temp": "22.2\u00b0C",
          "power": "1.4 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-307",
          "name": "B-307",
          "x": -20.5,
          "z": 20.0,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "MAINTENANCE",
          "occupancy": "0/0",
          "temp": "18.0\u00b0C",
          "power": "0.0 kW",
          "hvac": "OFF"
        },
        {
          "id": "b-308",
          "name": "B-308",
          "x": -20.5,
          "z": 25.0,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "20/40",
          "temp": "21.1\u00b0C",
          "power": "0.8 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-309",
          "name": "B-309",
          "x": -20.5,
          "z": 30.0,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "14/40",
          "temp": "20.8\u00b0C",
          "power": "0.7 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-310",
          "name": "B-310",
          "x": -20.5,
          "z": 35.0,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "24/40",
          "temp": "21.0\u00b0C",
          "power": "0.9 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "rattaiah_square_f4",
          "name": "Rattaiah Square Balcony (FLR 4)",
          "x": 26.125,
          "z": 7.75,
          "w": 22.25,
          "h": 0.05,
          "d": 60.0,
          "status": "GARDEN",
          "desc": "Floor 2 open-air balcony overlooking Rattaiah Square."
        },
        {
          "id": "b-320",
          "name": "B-320",
          "x": 15,
          "z": -24.5,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "35/40",
          "temp": "22.0\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-319",
          "name": "B-319",
          "x": 20,
          "z": -24.5,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "28/40",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-318",
          "name": "B-318",
          "x": 25,
          "z": -24.5,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "WARNING",
          "occupancy": "38/40",
          "temp": "24.5\u00b0C",
          "power": "2.8 kW",
          "hvac": "OVERLOAD"
        },
        {
          "id": "b-317",
          "name": "B-317",
          "x": 30,
          "z": -24.5,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "0/40",
          "temp": "19.5\u00b0C",
          "power": "0.1 kW",
          "hvac": "STANDBY"
        },
        {
          "id": "b-316",
          "name": "B-316",
          "x": 35,
          "z": -24.5,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "15/40",
          "temp": "21.1\u00b0C",
          "power": "0.8 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-321",
          "name": "B-321",
          "x": 44.0,
          "z": -12.25,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "30/40",
          "temp": "21.6\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-322",
          "name": "B-322",
          "x": 44.0,
          "z": -2.25,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "22/40",
          "temp": "22.0\u00b0C",
          "power": "1.3 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-323",
          "name": "B-323",
          "x": 44.0,
          "z": 7.75,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "26/40",
          "temp": "21.4\u00b0C",
          "power": "1.0 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "lab-3d",
          "name": "Lab 3B",
          "x": 44.75,
          "z": 18.5,
          "w": 6.0,
          "h": 3.5,
          "d": 6.0,
          "status": "SECURE",
          "desc": "Floor 4 lab space."
        },
        {
          "id": "lab-4d",
          "name": "Lab 4B",
          "x": 44.75,
          "z": 30.0,
          "w": 6.0,
          "h": 3.5,
          "d": 6.0,
          "status": "SECURE",
          "desc": "Floor 4 lab space."
        },
        {
          "id": "lab-3b",
          "name": "Lab 1B",
          "x": 32.75,
          "z": 44.5,
          "w": 5.5,
          "h": 3.5,
          "d": 6.0,
          "status": "SECURE",
          "desc": "Floor 2 computer science lab."
        },
        {
          "id": "lab-2d",
          "name": "Lab 2B",
          "x": 25.75,
          "z": 44.5,
          "w": 5.5,
          "h": 3.5,
          "d": 6.0,
          "status": "SECURE",
          "desc": "Floor 4 lab space."
        },
        {
          "id": "b-324",
          "name": "B-324",
          "x": 19.25,
          "z": 44.5,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "18/40",
          "temp": "21.1\u00b0C",
          "power": "0.9 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-325",
          "name": "B-325",
          "x": 13.25,
          "z": 44.5,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "0/40",
          "temp": "19.8\u00b0C",
          "power": "0.2 kW",
          "hvac": "STANDBY"
        },
        {
          "id": "b-311",
          "name": "B-311",
          "x": 12.5,
          "z": -10,
          "w": 5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "30/40",
          "temp": "22.2\u00b0C",
          "power": "1.4 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-312",
          "name": "B-312",
          "x": 12.5,
          "z": -5,
          "w": 5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "35/40",
          "temp": "21.9\u00b0C",
          "power": "1.3 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-313",
          "name": "B-313",
          "x": 12.5,
          "z": 0,
          "w": 5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "24/40",
          "temp": "21.0\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-314",
          "name": "B-314",
          "x": 12.5,
          "z": 5,
          "w": 5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "31/40",
          "temp": "22.1\u00b0C",
          "power": "1.4 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-315",
          "name": "B-315",
          "x": 12.5,
          "z": 10,
          "w": 5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "18/40",
          "temp": "20.9\u00b0C",
          "power": "0.9 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-316-c",
          "name": "B-316",
          "x": 12.5,
          "z": 15,
          "w": 5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "22/40",
          "temp": "21.4\u00b0C",
          "power": "1.0 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-317-c",
          "name": "B-317",
          "x": 12.5,
          "z": 20,
          "w": 5,
          "h": 3.5,
          "d": 4.5,
          "status": "MAINTENANCE",
          "occupancy": "0/0",
          "temp": "18.0\u00b0C",
          "power": "0.0 kW",
          "hvac": "OFF"
        },
        {
          "id": "b-318-c",
          "name": "B-318",
          "x": 12.5,
          "z": 25,
          "w": 5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "27/40",
          "temp": "21.7\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-319-c",
          "name": "B-319",
          "x": 12.5,
          "z": 30,
          "w": 5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "14/40",
          "temp": "20.8\u00b0C",
          "power": "0.7 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-320-c",
          "name": "B-320",
          "x": 12.5,
          "z": 35,
          "w": 5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "20/40",
          "temp": "21.0\u00b0C",
          "power": "0.9 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-326",
          "name": "B-326",
          "x": 7.0,
          "z": 44.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "32/40",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-327",
          "name": "B-327",
          "x": 1.5,
          "z": 44.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "28/40",
          "temp": "21.8\u00b0C",
          "power": "1.0 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg_balcony_f4",
          "name": "PG Garden Balcony (FLR 4)",
          "x": 95.0,
          "z": 10.0,
          "w": 15.0,
          "h": 0.05,
          "d": 18.0,
          "status": "GARDEN",
          "desc": "Floor 4 interior perimeter balcony overlooking PG Central Garden."
        },
        {
          "id": "pg-301",
          "name": "PG-301",
          "x": 82.5,
          "z": -1.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "21/35",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg-302",
          "name": "PG-302",
          "x": 82.5,
          "z": 5.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "22/35",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg-303",
          "name": "PG-303",
          "x": 82.5,
          "z": 11.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "23/35",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg-304",
          "name": "PG-304",
          "x": 82.5,
          "z": 17.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "24/35",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg-305",
          "name": "PG-305",
          "x": 107.5,
          "z": -1.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "20/35",
          "temp": "21.2\u00b0C",
          "power": "1.0 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg-306",
          "name": "PG-306",
          "x": 107.5,
          "z": 5.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "21/35",
          "temp": "21.2\u00b0C",
          "power": "1.0 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg-307",
          "name": "PG-307",
          "x": 107.5,
          "z": 11.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "22/35",
          "temp": "21.2\u00b0C",
          "power": "1.0 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg-308",
          "name": "PG-308",
          "x": 107.5,
          "z": 17.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "23/35",
          "temp": "21.2\u00b0C",
          "power": "1.0 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg-309",
          "name": "PG-309",
          "x": 91.5,
          "z": -6.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "28/35",
          "temp": "21.8\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg-310",
          "name": "PG-310",
          "x": 98.5,
          "z": -6.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "28/35",
          "temp": "21.8\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg-311",
          "name": "PG-311",
          "x": 82.5,
          "z": 26.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "18/35",
          "temp": "21.0\u00b0C",
          "power": "0.9 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg-312",
          "name": "PG-312",
          "x": 107.5,
          "z": 26.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "18/35",
          "temp": "21.0\u00b0C",
          "power": "0.9 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg_lab_f4",
          "name": "PG Advanced Computing Lab",
          "x": 95.0,
          "z": 27.5,
          "w": 8.0,
          "h": 4.0,
          "d": 6.0,
          "status": "SECURE",
          "occupancy": "40/60",
          "temp": "21.5\u00b0C",
          "power": "3.5 kW",
          "hvac": "NOMINAL",
          "desc": "PG Block FLR 4 main facility space."
        },
        {
          "id": "pg-313",
          "name": "PG-313",
          "x": 82.5,
          "z": 33.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "27/40",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg-314",
          "name": "PG-314",
          "x": 107.5,
          "z": 33.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "33/40",
          "temp": "22.2\u00b0C",
          "power": "1.3 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg-315",
          "name": "PG-315",
          "x": 82.5,
          "z": 46.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "21/40",
          "temp": "21.4\u00b0C",
          "power": "1.0 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg-316",
          "name": "PG-316",
          "x": 91.5,
          "z": 46.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "27/40",
          "temp": "21.8\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg-317",
          "name": "PG-317",
          "x": 98.5,
          "z": 46.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "28/40",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg-318",
          "name": "PG-318",
          "x": 107.5,
          "z": 46.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "32/40",
          "temp": "22.1\u00b0C",
          "power": "1.3 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d_balcony_f4",
          "name": "D Garden Balcony (FLR 4)",
          "x": 95.0,
          "z": -75.0,
          "w": 15.0,
          "h": 0.2,
          "d": 18.0,
          "status": "SECURE",
          "occupancy": "2/10",
          "temp": "22.0\u00b0C",
          "power": "0.3 kW",
          "desc": "Floor 4 interior perimeter balcony overlooking D Central Garden."
        },
        {
          "id": "d_lab_f4",
          "name": "D Advanced Computing Lab",
          "x": 95.0,
          "z": -92.5,
          "w": 8.0,
          "h": 3.5,
          "d": 6.0,
          "status": "SECURE",
          "occupancy": "18/30",
          "temp": "21.5\u00b0C",
          "power": "1.8 kW",
          "desc": "D Block FLR 4 main facility space."
        },
        {
          "id": "d-301",
          "name": "D-301",
          "x": 82.5,
          "z": -64.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "20/40",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d-302",
          "name": "D-302",
          "x": 82.5,
          "z": -70.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "22/40",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d-303",
          "name": "D-303",
          "x": 82.5,
          "z": -76.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "24/40",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d-304",
          "name": "D-304",
          "x": 82.5,
          "z": -82.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "26/40",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d-311",
          "name": "D-311",
          "x": 82.5,
          "z": -88.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "28/40",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d-313",
          "name": "D-313",
          "x": 82.5,
          "z": -94.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "30/40",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d-305",
          "name": "D-305",
          "x": 107.5,
          "z": -64.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "22/40",
          "temp": "21.8\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d-306",
          "name": "D-306",
          "x": 107.5,
          "z": -70.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "24/40",
          "temp": "21.8\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d-307",
          "name": "D-307",
          "x": 107.5,
          "z": -76.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "26/40",
          "temp": "21.8\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d-308",
          "name": "D-308",
          "x": 107.5,
          "z": -82.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "28/40",
          "temp": "21.8\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d-312",
          "name": "D-312",
          "x": 107.5,
          "z": -88.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "30/40",
          "temp": "21.8\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d-314",
          "name": "D-314",
          "x": 107.5,
          "z": -94.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "32/40",
          "temp": "21.8\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d-315",
          "name": "D-315",
          "x": 82.5,
          "z": -48.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "24/40",
          "temp": "21.4\u00b0C",
          "power": "1.0 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d-316",
          "name": "D-316",
          "x": 91.5,
          "z": -48.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "28/40",
          "temp": "21.9\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d-317",
          "name": "D-317",
          "x": 98.5,
          "z": -48.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "29/40",
          "temp": "21.7\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d-318",
          "name": "D-318",
          "x": 107.5,
          "z": -48.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "32/40",
          "temp": "22.1\u00b0C",
          "power": "1.3 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d-309",
          "name": "D-309",
          "x": 91.5,
          "z": -101.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "15/40",
          "temp": "21.0\u00b0C",
          "power": "0.9 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d-310",
          "name": "D-310",
          "x": 98.5,
          "z": -101.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "18/40",
          "temp": "21.2\u00b0C",
          "power": "1.0 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e_balcony_f4",
          "name": "D Garden Balcony (FLR 4)",
          "x": -75.0,
          "z": -75.0,
          "w": 15.0,
          "h": 0.2,
          "d": 18.0,
          "status": "SECURE",
          "occupancy": "2/10",
          "temp": "22.0\u00b0C",
          "power": "0.3 kW",
          "desc": "Floor 4 interior perimeter balcony overlooking D Central Garden."
        },
        {
          "id": "e_lab_f4",
          "name": "D Advanced Computing Lab",
          "x": -75.0,
          "z": -92.5,
          "w": 8.0,
          "h": 3.5,
          "d": 6.0,
          "status": "SECURE",
          "occupancy": "18/30",
          "temp": "21.5\u00b0C",
          "power": "1.8 kW",
          "desc": "E Block FLR 4 main facility space."
        },
        {
          "id": "e-301",
          "name": "E-301",
          "x": -87.5,
          "z": -64.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "20/40",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e-302",
          "name": "E-302",
          "x": -87.5,
          "z": -70.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "22/40",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e-303",
          "name": "E-303",
          "x": -87.5,
          "z": -76.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "24/40",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e-304",
          "name": "E-304",
          "x": -87.5,
          "z": -82.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "26/40",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e-311",
          "name": "E-311",
          "x": -87.5,
          "z": -88.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "28/40",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e-313",
          "name": "E-313",
          "x": -87.5,
          "z": -94.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "30/40",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e-305",
          "name": "E-305",
          "x": -62.5,
          "z": -64.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "22/40",
          "temp": "21.8\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e-306",
          "name": "E-306",
          "x": -62.5,
          "z": -70.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "24/40",
          "temp": "21.8\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e-307",
          "name": "E-307",
          "x": -62.5,
          "z": -76.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "26/40",
          "temp": "21.8\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e-308",
          "name": "E-308",
          "x": -62.5,
          "z": -82.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "28/40",
          "temp": "21.8\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e-312",
          "name": "E-312",
          "x": -62.5,
          "z": -88.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "30/40",
          "temp": "21.8\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e-314",
          "name": "E-314",
          "x": -62.5,
          "z": -94.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "32/40",
          "temp": "21.8\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e-315",
          "name": "E-315",
          "x": -87.5,
          "z": -48.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "24/40",
          "temp": "21.4\u00b0C",
          "power": "1.0 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e-316",
          "name": "E-316",
          "x": -78.5,
          "z": -48.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "28/40",
          "temp": "21.9\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e-317",
          "name": "E-317",
          "x": -71.5,
          "z": -48.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "29/40",
          "temp": "21.7\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e-318",
          "name": "E-318",
          "x": -62.5,
          "z": -48.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "32/40",
          "temp": "22.1\u00b0C",
          "power": "1.3 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e-309",
          "name": "E-309",
          "x": -78.5,
          "z": -101.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "15/40",
          "temp": "21.0\u00b0C",
          "power": "0.9 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e-310",
          "name": "E-310",
          "x": -71.5,
          "z": -101.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "18/40",
          "temp": "21.2\u00b0C",
          "power": "1.0 kW",
          "hvac": "NOMINAL"
        }
      ],
      "connectors": [],
      "staircases": [
        {
          "id": "Internal_V_Staircase",
          "name": "Internal V-Shaped Staircase",
          "x": 0.0,
          "z": -20.0,
          "height": 8.0,
          "type": "v_switchback",
          "connects": [
            "FLR 3",
            "FLR 4"
          ],
          "from": "FLR 3 Corridor",
          "to": "FLR 4 Corridor"
        },
        {
          "id": "staircase-central-tower",
          "name": "Central Tower Staircase",
          "x": -42.0,
          "z": 20.0,
          "height": 32.0
        },
        {
          "id": "staircase-rattaiah",
          "name": "Rattaiah Staircase",
          "x": 39.5,
          "z": 35.0,
          "height": 8.0
        },
        {
          "id": "staircase-pg-internal",
          "name": "PG Internal V-Staircase",
          "x": 95.0,
          "z": 21.0,
          "height": 8.0,
          "type": "v_switchback",
          "connects": [
            "FLR 4",
            "FLR 5"
          ],
          "from": "PG FLR 4 Corridor",
          "to": "PG FLR 5 Corridor"
        },
        {
          "id": "staircase-d-internal",
          "name": "D Internal V-Staircase",
          "x": 95.0,
          "z": -75.0,
          "w": 4.0,
          "h": 4.0,
          "d": 4.0,
          "type": "Internal_V_Staircase",
          "from": "D FLR 4 Corridor",
          "to": "D FLR 5 Corridor"
        }
      ]
    },
    {
      "id": 5,
      "name": "Floor 5 (4th Floor)",
      "elevation": 32.0,
      "corridors": [
        {
          "x": 0,
          "z": -20.0,
          "w": 5.0,
          "h": 0.2,
          "d": 35.0
        },
        {
          "x": -21.0,
          "z": -20.0,
          "w": 42.0,
          "h": 0.2,
          "d": 4.5
        },
        {
          "x": -42.0,
          "z": 10.0,
          "w": 4.5,
          "h": 0.2,
          "d": 60.0
        },
        {
          "x": -1.25,
          "z": 40.0,
          "w": 81.5,
          "h": 0.2,
          "d": 4.5
        },
        {
          "x": -16.0,
          "z": 10.0,
          "w": 4.5,
          "h": 0.2,
          "d": 60.0
        },
        {
          "x": 23.5,
          "z": -20.0,
          "w": 32.0,
          "h": 0.2,
          "d": 4.5
        },
        {
          "x": 7.5,
          "z": 12.5,
          "w": 4.5,
          "h": 0.2,
          "d": 60.0
        },
        {
          "x": 39.5,
          "z": 10.0,
          "w": 4.5,
          "h": 0.2,
          "d": 60.0
        },
        {
          "x": 89.0,
          "z": 19.5,
          "w": 4.5,
          "h": 0.2,
          "d": 45.5
        },
        {
          "x": 101.0,
          "z": 19.5,
          "w": 4.5,
          "h": 0.2,
          "d": 45.5
        },
        {
          "x": 95.0,
          "z": -1.0,
          "w": 16.5,
          "h": 0.2,
          "d": 4.5
        },
        {
          "x": 95.0,
          "z": 21.0,
          "w": 16.5,
          "h": 0.2,
          "d": 4.5
        },
        {
          "x": 95.0,
          "z": 40.0,
          "w": 16.5,
          "h": 0.2,
          "d": 4.5
        },
        {
          "x": 89.0,
          "z": -72.5,
          "w": 4.5,
          "h": 0.2,
          "d": 45.5
        },
        {
          "x": 101.0,
          "z": -72.5,
          "w": 4.5,
          "h": 0.2,
          "d": 45.5
        },
        {
          "x": 95.0,
          "z": -55.0,
          "w": 16.5,
          "h": 0.2,
          "d": 4.5
        },
        {
          "x": 95.0,
          "z": -74.0,
          "w": 16.5,
          "h": 0.2,
          "d": 4.5
        },
        {
          "x": 95.0,
          "z": -96.0,
          "w": 16.5,
          "h": 0.2,
          "d": 4.5
        },
        {
          "x": -81.0,
          "z": -72.5,
          "w": 4.5,
          "h": 0.2,
          "d": 45.5
        },
        {
          "x": -69.0,
          "z": -72.5,
          "w": 4.5,
          "h": 0.2,
          "d": 45.5
        },
        {
          "x": -75.0,
          "z": -55.0,
          "w": 16.5,
          "h": 0.2,
          "d": 4.5
        },
        {
          "x": -75.0,
          "z": -74.0,
          "w": 16.5,
          "h": 0.2,
          "d": 4.5
        },
        {
          "x": -75.0,
          "z": -96.0,
          "w": 16.5,
          "h": 0.2,
          "d": 4.5
        }
      ],
      "rooms": [
        {
          "id": "accounts-f5",
          "name": "Accounts Section (FLR 5)",
          "x": -12.5,
          "z": -24.5,
          "w": 6.0,
          "h": 3.5,
          "d": 5.0,
          "status": "SECURE",
          "occupancy": "12/15",
          "temp": "21.5\u00b0C",
          "power": "0.6 kW",
          "hvac": "NOMINAL",
          "desc": "Accounts and payroll office."
        },
        {
          "id": "panda_punnaiah_square_f5",
          "name": "Panda Punnaiah Square (FLR 5)",
          "x": -32.875,
          "z": 10.125,
          "w": 20.25,
          "h": 0.05,
          "d": 55.25,
          "status": "GARDEN",
          "desc": "Panda Punnaiah Square elevated garden courtyard."
        },
        {
          "id": "library-f5",
          "name": "Library (FLR 5)",
          "x": -47.5,
          "z": 13.5,
          "w": 9.0,
          "h": 5.0,
          "d": 26.0,
          "status": "SECURE",
          "occupancy": "85/150",
          "temp": "21.0\u00b0C",
          "power": "2.4 kW",
          "hvac": "NOMINAL",
          "desc": "Massive Floor 2 campus library spanning above the Auditorium."
        },
        {
          "id": "workshop-1-f5",
          "name": "Workshop 1",
          "x": -35.0,
          "z": 44.5,
          "w": 5.5,
          "h": 3.5,
          "d": 6.0,
          "status": "SECURE",
          "desc": "Floor 2 CS workshop."
        },
        {
          "id": "workshop-2-f5",
          "name": "Workshop 2",
          "x": -28.0,
          "z": 44.5,
          "w": 5.5,
          "h": 3.5,
          "d": 6.0,
          "status": "SECURE",
          "desc": "Floor 2 electronics workshop."
        },
        {
          "id": "washroom-1a-f5",
          "name": "Washroom 1A",
          "x": -9.0,
          "z": 44.5,
          "w": 4.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "1/5",
          "temp": "20.1\u00b0C",
          "power": "0.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "washroom-1b-f5",
          "name": "Washroom 1B",
          "x": -4.0,
          "z": 44.5,
          "w": 4.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "2/5",
          "temp": "20.4\u00b0C",
          "power": "0.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-401",
          "name": "B-401",
          "x": -20.5,
          "z": -10.0,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "30/40",
          "temp": "21.5\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-402",
          "name": "B-402",
          "x": -20.5,
          "z": -5.0,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "28/40",
          "temp": "21.6\u00b0C",
          "power": "1.0 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-403",
          "name": "B-403",
          "x": -20.5,
          "z": 0.0,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "35/40",
          "temp": "22.0\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-404",
          "name": "B-404",
          "x": -20.5,
          "z": 5.0,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "0/40",
          "temp": "19.5\u00b0C",
          "power": "0.1 kW",
          "hvac": "STANDBY"
        },
        {
          "id": "b-405",
          "name": "B-405",
          "x": -20.5,
          "z": 10.0,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "25/40",
          "temp": "21.8\u00b0C",
          "power": "0.9 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-406",
          "name": "B-406",
          "x": -20.5,
          "z": 15.0,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "33/40",
          "temp": "22.2\u00b0C",
          "power": "1.4 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-407",
          "name": "B-407",
          "x": -20.5,
          "z": 20.0,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "MAINTENANCE",
          "occupancy": "0/0",
          "temp": "18.0\u00b0C",
          "power": "0.0 kW",
          "hvac": "OFF"
        },
        {
          "id": "b-408",
          "name": "B-408",
          "x": -20.5,
          "z": 25.0,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "20/40",
          "temp": "21.1\u00b0C",
          "power": "0.8 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-409",
          "name": "B-409",
          "x": -20.5,
          "z": 30.0,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "14/40",
          "temp": "20.8\u00b0C",
          "power": "0.7 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-410",
          "name": "B-410",
          "x": -20.5,
          "z": 35.0,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "24/40",
          "temp": "21.0\u00b0C",
          "power": "0.9 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "rattaiah_square_f5",
          "name": "Rattaiah Square Balcony (FLR 5)",
          "x": 26.125,
          "z": 7.75,
          "w": 22.25,
          "h": 0.05,
          "d": 60.0,
          "status": "GARDEN",
          "desc": "Floor 2 open-air balcony overlooking Rattaiah Square."
        },
        {
          "id": "b-420",
          "name": "B-420",
          "x": 15,
          "z": -24.5,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "35/40",
          "temp": "22.0\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-419",
          "name": "B-419",
          "x": 20,
          "z": -24.5,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "28/40",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-418",
          "name": "B-418",
          "x": 25,
          "z": -24.5,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "WARNING",
          "occupancy": "38/40",
          "temp": "24.5\u00b0C",
          "power": "2.8 kW",
          "hvac": "OVERLOAD"
        },
        {
          "id": "b-417",
          "name": "B-417",
          "x": 30,
          "z": -24.5,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "0/40",
          "temp": "19.5\u00b0C",
          "power": "0.1 kW",
          "hvac": "STANDBY"
        },
        {
          "id": "b-416",
          "name": "B-416",
          "x": 35,
          "z": -24.5,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "15/40",
          "temp": "21.1\u00b0C",
          "power": "0.8 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-421",
          "name": "B-421",
          "x": 44.0,
          "z": -12.25,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "30/40",
          "temp": "21.6\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-422",
          "name": "B-422",
          "x": 44.0,
          "z": -2.25,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "22/40",
          "temp": "22.0\u00b0C",
          "power": "1.3 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-423",
          "name": "B-423",
          "x": 44.0,
          "z": 7.75,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "26/40",
          "temp": "21.4\u00b0C",
          "power": "1.0 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "lab-3e",
          "name": "Lab 3B",
          "x": 44.75,
          "z": 18.5,
          "w": 6.0,
          "h": 3.5,
          "d": 6.0,
          "status": "SECURE",
          "desc": "Floor 5 lab space."
        },
        {
          "id": "lab-4e",
          "name": "Lab 4B",
          "x": 44.75,
          "z": 30.0,
          "w": 6.0,
          "h": 3.5,
          "d": 6.0,
          "status": "SECURE",
          "desc": "Floor 5 lab space."
        },
        {
          "id": "lab-4b",
          "name": "Lab 1B",
          "x": 32.75,
          "z": 44.5,
          "w": 5.5,
          "h": 3.5,
          "d": 6.0,
          "status": "SECURE",
          "desc": "Floor 2 computer science lab."
        },
        {
          "id": "lab-2e",
          "name": "Lab 2B",
          "x": 25.75,
          "z": 44.5,
          "w": 5.5,
          "h": 3.5,
          "d": 6.0,
          "status": "SECURE",
          "desc": "Floor 5 lab space."
        },
        {
          "id": "b-424",
          "name": "B-424",
          "x": 19.25,
          "z": 44.5,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "18/40",
          "temp": "21.1\u00b0C",
          "power": "0.9 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-425",
          "name": "B-425",
          "x": 13.25,
          "z": 44.5,
          "w": 4.5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "0/40",
          "temp": "19.8\u00b0C",
          "power": "0.2 kW",
          "hvac": "STANDBY"
        },
        {
          "id": "b-411",
          "name": "B-411",
          "x": 12.5,
          "z": -10,
          "w": 5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "30/40",
          "temp": "22.2\u00b0C",
          "power": "1.4 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-412",
          "name": "B-412",
          "x": 12.5,
          "z": -5,
          "w": 5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "35/40",
          "temp": "21.9\u00b0C",
          "power": "1.3 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-413",
          "name": "B-413",
          "x": 12.5,
          "z": 0,
          "w": 5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "24/40",
          "temp": "21.0\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-414",
          "name": "B-414",
          "x": 12.5,
          "z": 5,
          "w": 5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "31/40",
          "temp": "22.1\u00b0C",
          "power": "1.4 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-415",
          "name": "B-415",
          "x": 12.5,
          "z": 10,
          "w": 5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "18/40",
          "temp": "20.9\u00b0C",
          "power": "0.9 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-416-c",
          "name": "B-416",
          "x": 12.5,
          "z": 15,
          "w": 5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "22/40",
          "temp": "21.4\u00b0C",
          "power": "1.0 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-417-c",
          "name": "B-417",
          "x": 12.5,
          "z": 20,
          "w": 5,
          "h": 3.5,
          "d": 4.5,
          "status": "MAINTENANCE",
          "occupancy": "0/0",
          "temp": "18.0\u00b0C",
          "power": "0.0 kW",
          "hvac": "OFF"
        },
        {
          "id": "b-418-c",
          "name": "B-418",
          "x": 12.5,
          "z": 25,
          "w": 5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "27/40",
          "temp": "21.7\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-419-c",
          "name": "B-419",
          "x": 12.5,
          "z": 30,
          "w": 5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "14/40",
          "temp": "20.8\u00b0C",
          "power": "0.7 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-420-c",
          "name": "B-420",
          "x": 12.5,
          "z": 35,
          "w": 5,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "20/40",
          "temp": "21.0\u00b0C",
          "power": "0.9 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-426",
          "name": "B-426",
          "x": 7.0,
          "z": 44.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "32/40",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "b-427",
          "name": "B-427",
          "x": 1.5,
          "z": 44.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "28/40",
          "temp": "21.8\u00b0C",
          "power": "1.0 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg_balcony_f5",
          "name": "PG Garden Balcony (FLR 5)",
          "x": 95.0,
          "z": 10.0,
          "w": 15.0,
          "h": 0.05,
          "d": 18.0,
          "status": "GARDEN",
          "desc": "Floor 5 interior perimeter balcony overlooking PG Central Garden."
        },
        {
          "id": "pg-401",
          "name": "PG-401",
          "x": 82.5,
          "z": -1.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "21/35",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg-402",
          "name": "PG-402",
          "x": 82.5,
          "z": 5.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "22/35",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg-403",
          "name": "PG-403",
          "x": 82.5,
          "z": 11.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "23/35",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg-404",
          "name": "PG-404",
          "x": 82.5,
          "z": 17.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "24/35",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg-405",
          "name": "PG-405",
          "x": 107.5,
          "z": -1.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "20/35",
          "temp": "21.2\u00b0C",
          "power": "1.0 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg-406",
          "name": "PG-406",
          "x": 107.5,
          "z": 5.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "21/35",
          "temp": "21.2\u00b0C",
          "power": "1.0 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg-407",
          "name": "PG-407",
          "x": 107.5,
          "z": 11.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "22/35",
          "temp": "21.2\u00b0C",
          "power": "1.0 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg-408",
          "name": "PG-408",
          "x": 107.5,
          "z": 17.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "23/35",
          "temp": "21.2\u00b0C",
          "power": "1.0 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg-409",
          "name": "PG-409",
          "x": 91.5,
          "z": -6.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "28/35",
          "temp": "21.8\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg-410",
          "name": "PG-410",
          "x": 98.5,
          "z": -6.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "28/35",
          "temp": "21.8\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg-411",
          "name": "PG-411",
          "x": 82.5,
          "z": 26.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "18/35",
          "temp": "21.0\u00b0C",
          "power": "0.9 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg-412",
          "name": "PG-412",
          "x": 107.5,
          "z": 26.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "18/35",
          "temp": "21.0\u00b0C",
          "power": "0.9 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg_lab_f5",
          "name": "PG Innovation Hub",
          "x": 95.0,
          "z": 27.5,
          "w": 8.0,
          "h": 4.0,
          "d": 6.0,
          "status": "SECURE",
          "occupancy": "40/60",
          "temp": "21.5\u00b0C",
          "power": "3.5 kW",
          "hvac": "NOMINAL",
          "desc": "PG Block FLR 5 main facility space."
        },
        {
          "id": "pg-413",
          "name": "PG-413",
          "x": 82.5,
          "z": 33.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "29/40",
          "temp": "21.6\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg-414",
          "name": "PG-414",
          "x": 107.5,
          "z": 33.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "35/40",
          "temp": "22.4\u00b0C",
          "power": "1.5 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg-415",
          "name": "PG-415",
          "x": 82.5,
          "z": 46.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "23/40",
          "temp": "21.3\u00b0C",
          "power": "1.0 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg-416",
          "name": "PG-416",
          "x": 91.5,
          "z": 46.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "30/40",
          "temp": "22.0\u00b0C",
          "power": "1.3 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg-417",
          "name": "PG-417",
          "x": 98.5,
          "z": 46.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "31/40",
          "temp": "21.8\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "pg-418",
          "name": "PG-418",
          "x": 107.5,
          "z": 46.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "34/40",
          "temp": "22.3\u00b0C",
          "power": "1.4 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d_balcony_f5",
          "name": "D Garden Balcony (FLR 5)",
          "x": 95.0,
          "z": -75.0,
          "w": 15.0,
          "h": 0.2,
          "d": 18.0,
          "status": "SECURE",
          "occupancy": "2/10",
          "temp": "22.0\u00b0C",
          "power": "0.3 kW",
          "desc": "Floor 5 interior perimeter balcony overlooking D Central Garden."
        },
        {
          "id": "d_lab_f5",
          "name": "D Innovation Hub",
          "x": 95.0,
          "z": -92.5,
          "w": 8.0,
          "h": 3.5,
          "d": 6.0,
          "status": "SECURE",
          "occupancy": "18/30",
          "temp": "21.5\u00b0C",
          "power": "1.8 kW",
          "desc": "D Block FLR 5 main facility space."
        },
        {
          "id": "d-401",
          "name": "D-401",
          "x": 82.5,
          "z": -64.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "20/40",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d-402",
          "name": "D-402",
          "x": 82.5,
          "z": -70.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "22/40",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d-403",
          "name": "D-403",
          "x": 82.5,
          "z": -76.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "24/40",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d-404",
          "name": "D-404",
          "x": 82.5,
          "z": -82.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "26/40",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d-411",
          "name": "D-411",
          "x": 82.5,
          "z": -88.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "28/40",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d-413",
          "name": "D-413",
          "x": 82.5,
          "z": -94.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "30/40",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d-405",
          "name": "D-405",
          "x": 107.5,
          "z": -64.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "22/40",
          "temp": "21.8\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d-406",
          "name": "D-406",
          "x": 107.5,
          "z": -70.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "24/40",
          "temp": "21.8\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d-407",
          "name": "D-407",
          "x": 107.5,
          "z": -76.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "26/40",
          "temp": "21.8\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d-408",
          "name": "D-408",
          "x": 107.5,
          "z": -82.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "28/40",
          "temp": "21.8\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d-412",
          "name": "D-412",
          "x": 107.5,
          "z": -88.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "30/40",
          "temp": "21.8\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d-414",
          "name": "D-414",
          "x": 107.5,
          "z": -94.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "32/40",
          "temp": "21.8\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d-415",
          "name": "D-415",
          "x": 82.5,
          "z": -48.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "24/40",
          "temp": "21.4\u00b0C",
          "power": "1.0 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d-416",
          "name": "D-416",
          "x": 91.5,
          "z": -48.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "28/40",
          "temp": "21.9\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d-417",
          "name": "D-417",
          "x": 98.5,
          "z": -48.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "29/40",
          "temp": "21.7\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d-418",
          "name": "D-418",
          "x": 107.5,
          "z": -48.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "32/40",
          "temp": "22.1\u00b0C",
          "power": "1.3 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d-409",
          "name": "D-409",
          "x": 91.5,
          "z": -101.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "15/40",
          "temp": "21.0\u00b0C",
          "power": "0.9 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "d-410",
          "name": "D-410",
          "x": 98.5,
          "z": -101.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "18/40",
          "temp": "21.2\u00b0C",
          "power": "1.0 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e_balcony_f5",
          "name": "D Garden Balcony (FLR 5)",
          "x": -75.0,
          "z": -75.0,
          "w": 15.0,
          "h": 0.2,
          "d": 18.0,
          "status": "SECURE",
          "occupancy": "2/10",
          "temp": "22.0\u00b0C",
          "power": "0.3 kW",
          "desc": "Floor 5 interior perimeter balcony overlooking D Central Garden."
        },
        {
          "id": "e_lab_f5",
          "name": "D Innovation Hub",
          "x": -75.0,
          "z": -92.5,
          "w": 8.0,
          "h": 3.5,
          "d": 6.0,
          "status": "SECURE",
          "occupancy": "18/30",
          "temp": "21.5\u00b0C",
          "power": "1.8 kW",
          "desc": "E Block FLR 5 main facility space."
        },
        {
          "id": "e-401",
          "name": "E-401",
          "x": -87.5,
          "z": -64.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "20/40",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e-402",
          "name": "E-402",
          "x": -87.5,
          "z": -70.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "22/40",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e-403",
          "name": "E-403",
          "x": -87.5,
          "z": -76.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "24/40",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e-404",
          "name": "E-404",
          "x": -87.5,
          "z": -82.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "26/40",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e-411",
          "name": "E-411",
          "x": -87.5,
          "z": -88.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "28/40",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e-413",
          "name": "E-413",
          "x": -87.5,
          "z": -94.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "30/40",
          "temp": "21.5\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e-405",
          "name": "E-405",
          "x": -62.5,
          "z": -64.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "22/40",
          "temp": "21.8\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e-406",
          "name": "E-406",
          "x": -62.5,
          "z": -70.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "24/40",
          "temp": "21.8\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e-407",
          "name": "E-407",
          "x": -62.5,
          "z": -76.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "26/40",
          "temp": "21.8\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e-408",
          "name": "E-408",
          "x": -62.5,
          "z": -82.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "28/40",
          "temp": "21.8\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e-412",
          "name": "E-412",
          "x": -62.5,
          "z": -88.0,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "30/40",
          "temp": "21.8\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e-414",
          "name": "E-414",
          "x": -62.5,
          "z": -94.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "32/40",
          "temp": "21.8\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e-415",
          "name": "E-415",
          "x": -87.5,
          "z": -48.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "24/40",
          "temp": "21.4\u00b0C",
          "power": "1.0 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e-416",
          "name": "E-416",
          "x": -78.5,
          "z": -48.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "28/40",
          "temp": "21.9\u00b0C",
          "power": "1.2 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e-417",
          "name": "E-417",
          "x": -71.5,
          "z": -48.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "29/40",
          "temp": "21.7\u00b0C",
          "power": "1.1 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e-418",
          "name": "E-418",
          "x": -62.5,
          "z": -48.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "32/40",
          "temp": "22.1\u00b0C",
          "power": "1.3 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e-409",
          "name": "E-409",
          "x": -78.5,
          "z": -101.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "15/40",
          "temp": "21.0\u00b0C",
          "power": "0.9 kW",
          "hvac": "NOMINAL"
        },
        {
          "id": "e-410",
          "name": "E-410",
          "x": -71.5,
          "z": -101.5,
          "w": 5.0,
          "h": 3.5,
          "d": 4.5,
          "status": "SECURE",
          "occupancy": "18/40",
          "temp": "21.2\u00b0C",
          "power": "1.0 kW",
          "hvac": "NOMINAL"
        }
      ],
      "connectors": [],
      "staircases": [
        {
          "id": "Internal_V_Staircase",
          "name": "Internal V-Shaped Staircase",
          "x": 0.0,
          "z": -20.0,
          "height": 8.0,
          "type": "v_switchback",
          "connects": [
            "FLR 4",
            "FLR 5"
          ],
          "from": "FLR 4 Corridor",
          "to": "FLR 5 Corridor"
        },
        {
          "id": "staircase-central-tower",
          "name": "Central Tower Staircase",
          "x": -42.0,
          "z": 20.0,
          "height": 32.0
        },
        {
          "id": "staircase-rattaiah",
          "name": "Rattaiah Staircase",
          "x": 39.5,
          "z": 35.0,
          "height": 8.0
        },
        {
          "id": "staircase-d-internal",
          "name": "D Internal V-Staircase",
          "x": 95.0,
          "z": -75.0,
          "w": 4.0,
          "h": 4.0,
          "d": 4.0,
          "type": "Internal_V_Staircase",
          "from": "D FLR 5 Corridor",
          "to": "D FLR 5 Corridor"
        }
      ]
    }
  ]
};;;;;;;;;;;;;;;;;;;;

// Initialize App
function init() {
    logToConsole("Initializing Campus Scene Engine...", "sys-msg");

    // 0. Initialize material templates (THREE must be loaded before this)
    baseMaterials = {
        corridor: new THREE.MeshStandardMaterial({
            color: 0x0a3854, emissive: 0x003d52, emissiveIntensity: 1.2,
            roughness: 0.3, metalness: 0.8, transparent: true, opacity: 0.95
        }),
        roomVolume: new THREE.MeshStandardMaterial({
            color: 0x00f0ff, emissive: 0x007799, emissiveIntensity: 0.5,
            opacity: 0.40, transparent: true, roughness: 0.2, metalness: 0.1, depthWrite: false
        }),
        roomVolumeWarning: new THREE.MeshStandardMaterial({
            color: 0xff9e00, emissive: 0x995e00, emissiveIntensity: 0.5,
            opacity: 0.40, transparent: true, roughness: 0.2, metalness: 0.1, depthWrite: false
        }),
        roomVolumeMaintenance: new THREE.MeshStandardMaterial({
            color: 0xbd00ff, emissive: 0x770099, emissiveIntensity: 0.5,
            opacity: 0.40, transparent: true, roughness: 0.2, metalness: 0.1, depthWrite: false
        }),
        roomEdge: new THREE.LineBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 1.0 }),
        roomEdgeWarning: new THREE.LineBasicMaterial({ color: 0xff9e00, transparent: true, opacity: 1.0 }),
        roomEdgeMaintenance: new THREE.LineBasicMaterial({ color: 0xbd00ff, transparent: true, opacity: 1.0 }),
        doorCyan: new THREE.MeshStandardMaterial({
            color: 0x081320, emissive: 0x00f0ff, emissiveIntensity: 1.2, transparent: true
        }),
        doorOrange: new THREE.MeshStandardMaterial({
            color: 0x160c04, emissive: 0xff9e00, emissiveIntensity: 1.2, transparent: true
        }),
        doorPurple: new THREE.MeshStandardMaterial({
            color: 0x12081f, emissive: 0xbd00ff, emissiveIntensity: 1.2, transparent: true
        }),
        portalA: new THREE.MeshStandardMaterial({
            color: 0x00a8ff, emissive: 0x0080ff, emissiveIntensity: 1.5, roughness: 0.1, transparent: true
        }),
        portalC: new THREE.MeshStandardMaterial({
            color: 0x00e676, emissive: 0x00c853, emissiveIntensity: 1.5, roughness: 0.1, transparent: true
        }),
        portalPG: new THREE.MeshStandardMaterial({
            color: 0xbd00ff, emissive: 0xaa00ff, emissiveIntensity: 1.5, roughness: 0.1, transparent: true
        }),
        coreNode: new THREE.MeshStandardMaterial({
            color: 0x00f0ff, emissive: 0x00f0ff, emissiveIntensity: 2.0, transparent: true, opacity: 0.8
        })
    };

    // 1. Scene & Renderer
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05070f);
    scene.fog = new THREE.Fog(0x05070f, 3000, 20000);

    const container = document.getElementById('canvas-container');
    renderer = new THREE.WebGLRenderer({ antialias: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));
    renderer.shadowMap.enabled = false;
    container.appendChild(renderer.domElement);

    // 2. Camera (Isometric Start)
    camera = new THREE.PerspectiveCamera(40, container.clientWidth / container.clientHeight, 0.1, 15000);
    camera.position.set(130, 140, -160);
    camera.far = 15000;
    camera.updateProjectionMatrix();

    // 3. OrbitControls (Unlocked zoom range)
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = false;
    controls.maxPolarAngle = Math.PI / 2 - 0.01;
    controls.minPolarAngle = 0.01;
    controls.minDistance = 2;
    controls.maxDistance = 5000;
    controls.target.set(20, 0, 10);

    // Export 3D global handles for routing engine and chatbot
    window.scene = scene;
    window.camera = camera;
    window.renderer = renderer;
    window.controls = controls;

    // 4. Raycaster & Mouse

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // 5. Environment & Lights
    buildEnvironment();

    // 6. Load Campus Layout Data
    loadCampusData();

    // 7. Handlers & Listeners
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('click', onMouseClick);
    
    setupBlockDropdown();
    setupFloorSelector();

    const hudToggleBtn = document.getElementById('btn-toggle-hud');
    const sidebarCloseBtn = document.getElementById('btn-close-sidebar');

    if (hudToggleBtn) {
        hudToggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleSidebar(e);
        });
    }

    if (sidebarCloseBtn) {
        sidebarCloseBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeSidebar(e);
        });
    }

    const macroReturnBtn = document.getElementById('btn-return-macro');
    if (macroReturnBtn) {
        macroReturnBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            resetToMacroView(e);
        });
    }

    document.getElementById('isolation-toggle').addEventListener('change', () => {
        logToConsole("Isolation mode toggle triggered.");
        updateFloorOpacities();
    });

    animate();
}

function buildEnvironment() {
    const ambientLight = new THREE.AmbientLight(0x2a3e5c, 1.2);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight1.position.set(40, 80, 50);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x00f0ff, 0.8);
    dirLight2.position.set(-40, 50, -50);
    scene.add(dirLight2);

    const dirLight3 = new THREE.DirectionalLight(0xbd00ff, 0.5);
    dirLight3.position.set(0, -30, 0);
    scene.add(dirLight3);

    const grid = new THREE.GridHelper(200, 200, 0x00f0ff, 0x1a263d);
    grid.position.y = -0.05;
    grid.material.opacity = 0.40;
    grid.material.transparent = true;
    scene.add(grid);
}

function loadCampusData() {
    fetch('floorsData.json?t=' + Date.now())
        .then(response => {
            if (!response.ok) throw new Error("Server response not ok");
            return response.json();
        })
        .then(data => {
            logToConsole("Database import: Remote layouts loaded.", "success");
            campusData = data;
            buildCampus();
        })
        .catch(err => {
            console.warn("Using offline inline data fallback.", err);
            logToConsole("Database import: Offline local fallback loaded.", "warning");
            campusData = fallbackCampusData;
            buildCampus();
        });
}

function buildCampus() {
    animatedConnectors = [];
    interactiveMeshes = [];
    labelsList = [];
    floorGroups = [];
    if (typeof roomsMeshMap !== 'undefined' && roomsMeshMap.clear) roomsMeshMap.clear();
    
    const container = document.getElementById('hud-labels-container');
    if (container) container.innerHTML = '';

    if (scene) {
        createBuildingShells();
        buildGroundNetwork();
        buildMainRoad();
        buildGroundAndParking();
    }
    campusData.floors.forEach((flData, idx) => {
        const flGroup = new THREE.Group();
        flGroup.position.y = flData.elevation;
        flGroup.userData = { floorId: flData.id, elevation: flData.elevation, name: flData.name };
        scene.add(flGroup);
        floorGroups.push(flGroup);

        flData.corridors.forEach(corr => {
            const geo = new THREE.BoxGeometry(corr.w, corr.h, corr.d);
            const mat = baseMaterials.corridor.clone();
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(corr.x, corr.h / 2, corr.z);
            mesh.userData = { type: 'corridor' };
            flGroup.add(mesh);

            const ribbonMat = new THREE.MeshStandardMaterial({
                color: 0x00f0ff,
                emissive: 0x00f0ff,
                emissiveIntensity: 1.5,
                transparent: true,
                opacity: 0.9
            });

            if (corr.d >= corr.w) {
                const borderX = corr.w / 2 - 0.125;
                const ribbonGeo = new THREE.BoxGeometry(0.25, 0.05, corr.d);
                
                const ribbonL = new THREE.Mesh(ribbonGeo, ribbonMat);
                ribbonL.position.set(corr.x - borderX, corr.h + 0.025, corr.z);
                
                const ribbonR = new THREE.Mesh(ribbonGeo, ribbonMat);
                ribbonR.position.set(corr.x + borderX, corr.h + 0.025, corr.z);
                
                flGroup.add(ribbonL);
                flGroup.add(ribbonR);
            } else {
                const borderZ = corr.d / 2 - 0.125;
                const ribbonGeo = new THREE.BoxGeometry(corr.w, 0.05, 0.25);
                
                const ribbonL = new THREE.Mesh(ribbonGeo, ribbonMat);
                ribbonL.position.set(corr.x, corr.h + 0.025, corr.z - borderZ);
                
                const ribbonR = new THREE.Mesh(ribbonGeo, ribbonMat);
                ribbonR.position.set(corr.x, corr.h + 0.025, corr.z + borderZ);
                
                flGroup.add(ribbonL);
                flGroup.add(ribbonR);
            }
        });

        flData.rooms.forEach(room => {
            let volMat = baseMaterials.roomVolume.clone();
            let edgeMat = baseMaterials.roomEdge.clone();
            let doorMat = baseMaterials.doorCyan.clone();

            if (room.status === 'GARDEN') {
                volMat = new THREE.MeshStandardMaterial({
                    color: 0x10b981,
                    opacity: 0.22,
                    transparent: true,
                    roughness: 0.8,
                    metalness: 0.0,
                    depthWrite: false
                });
                edgeMat = new THREE.LineBasicMaterial({
                    color: 0x059669,
                    transparent: true,
                    opacity: 0.5
                });
            }

            const roomGroup = new THREE.Group();
            roomGroup.position.set(room.x, room.h / 2 + 0.1, room.z);
            flGroup.add(roomGroup);

            const boxGeo = new THREE.BoxGeometry(room.w, room.h, room.d);
            const boxMesh = new THREE.Mesh(boxGeo, volMat);
            roomGroup.add(boxMesh);

            const edgesGeo = new THREE.EdgesGeometry(boxGeo);
            const edgesLine = new THREE.LineSegments(edgesGeo, edgeMat);
            roomGroup.add(edgesLine);

            let coreMesh = null;
            let doorMesh = null;
            let doorX = 0;
            let doorZ = 0;
            let isDoorOnZFace = false;

            if (room.status !== 'GARDEN') {
                let coreColor = 0x00f0ff;

                const coreGeo = new THREE.OctahedronGeometry(0.4, 0);
                const coreMat = baseMaterials.coreNode.clone();
                coreMat.color.setHex(coreColor);
                coreMat.emissive.setHex(coreColor);
                coreMesh = new THREE.Mesh(coreGeo, coreMat);
                coreMesh.position.set(0, -0.2, 0);
                coreMesh.visible = false;
                roomGroup.add(coreMesh);

                if (room.z < -22 || (room.z > 5 && room.z < 10 && room.x > 15)) {
                    doorZ = room.z < -22 ? room.d / 2 : -room.d / 2;
                    isDoorOnZFace = true;
                } else if (room.z > 38) {
                    doorZ = -room.d / 2;
                    isDoorOnZFace = true;
                } else {
                    doorX = room.x < 0 ? room.w / 2 : -room.w / 2;
                }

                const doorThick = 0.12;
                const doorW = 1.3;
                const doorH = 2.2;
                const doorGeo = isDoorOnZFace 
                    ? new THREE.BoxGeometry(doorW, doorH, doorThick)
                    : new THREE.BoxGeometry(doorThick, doorH, doorW);

                doorMesh = new THREE.Mesh(doorGeo, doorMat);
                doorMesh.position.set(doorX, -0.4, doorZ);
                roomGroup.add(doorMesh);
            }

            boxMesh.userData = {
                type: 'room',
                floorIdx: idx,
                meta: room,
                coreNode: coreMesh,
                doorMesh: doorMesh,
                doorAxis: isDoorOnZFace ? 'x' : 'z',
                edgesLine: edgesLine
            };
            if (doorMesh) {
                doorMesh.userData = { type: 'door', parentRoom: boxMesh };
            }

            interactiveMeshes.push(boxMesh);
            roomsMeshMap.set(room.id, { group: roomGroup, mesh: boxMesh, door: doorMesh, coreNode: coreMesh });

            const anchorPos = new THREE.Vector3(room.x, flData.elevation + room.h + 1.5, room.z);
            const rid = room.id.toLowerCase();
            let rSector = 'B-BLOCK';
            if (rid.startsWith('pg') || rid.startsWith('pg-') || rid.startsWith('pg_')) rSector = 'PG-BLOCK';
            else if (rid.startsWith('d-') || rid.startsWith('d_')) rSector = 'D-BLOCK';
            else if (rid.startsWith('e-') || rid.startsWith('e_')) rSector = 'E-BLOCK';
            else if (rid.startsWith('a-') || rid.startsWith('a_')) rSector = 'A-BLOCK';
            else if (rid.startsWith('c-') || rid.startsWith('c_')) rSector = 'C-BLOCK';
            else if (room.x < -15) rSector = 'A-BLOCK';
            else rSector = 'B-BLOCK';
            createHUDLabel(room.id, room.name, anchorPos, room.status, idx, '', false, rSector);
        });

        flData.connectors.forEach(conn => {
            if (conn.type === 'skybridge' || conn.id === 'Main_to_PG_Skybridge') {
                buildSkybridge(flGroup, conn, idx, flData);
                return;
            }
            let portalMat = baseMaterials.portalA.clone();
            if (conn.type === 'portal-c') portalMat = baseMaterials.portalC.clone();
            else if (conn.type === 'portal-pg') portalMat = baseMaterials.portalPG.clone();

            const cGroup = new THREE.Group();
            cGroup.position.set(conn.x, 0.8, conn.z);
            flGroup.add(cGroup);

            const cGeo = new THREE.IcosahedronGeometry(0.7, 1);
            const cMesh = new THREE.Mesh(cGeo, portalMat);
            cGroup.add(cMesh);

            const ringGeo = new THREE.TorusGeometry(1.1, 0.06, 8, 30);
            const ringMat = new THREE.MeshBasicMaterial({ color: portalMat.color, transparent: true, opacity: 0.5 });
            const ringMesh = new THREE.Mesh(ringGeo, ringMat);
            ringMesh.rotation.x = Math.PI / 2;
            cGroup.add(ringMesh);

            const pLight = new THREE.PointLight(portalMat.color, 2.0, 8);
            cGroup.add(pLight);

            cMesh.userData = {
                type: 'connector',
                floorIdx: idx,
                id: conn.id,
                name: conn.name,
                target: conn.target,
                ringMesh: ringMesh,
                pLight: pLight
            };

            interactiveMeshes.push(cMesh);
            animatedConnectors.push(cMesh);
            
            const anchorPos = new THREE.Vector3(conn.x, flData.elevation + 2.0, conn.z);
            createHUDLabel(conn.id, conn.name.toUpperCase(), anchorPos, conn.type.toUpperCase(), idx);
        });

        flData.staircases.forEach(st => {
            if (st.id === 'staircase-b-east-ext') {
                if (idx === 0) createEastExitDoorway(st.x, st.z, 0, flGroup);
            } else if (st.id === 'staircase-lab-1-4') {
                if (idx < 5) createVShapedStaircase(st.x, st.z, 0, st.height, flGroup, idx);
            } else if (st.id === 'staircase-grand-ext' || st.id === 'staircase-pg-ext') {
                if (idx === 0) createGrandEntranceStaircase(st.x, st.z, 0, st.height, flGroup);
            } else if (st.id === 'staircase-central-tower') {
                if (idx === 0) createCentralTowerStaircase(st.x, st.z, 0, 32.0, flGroup);
            } else if (st.id === 'staircase-b' || st.id === 'Internal_V_Staircase' || st.id === 'staircase-pg-internal') {
                if (idx < 4) createVShapedStaircase(st.x, st.z, 0, st.height, flGroup, idx);
            } else {
                const stepsGroup = new THREE.Group();
                stepsGroup.position.set(st.x, 0, st.z);
                const stairsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.6, roughness: 0.4 });
                const flight = new THREE.Mesh(new THREE.BoxGeometry(2.0, 4.0, 5.0), stairsMat);
                flight.position.set(0, 2.0, 0);
                flight.rotation.x = 0.6;
                stepsGroup.add(flight);
                flGroup.add(stepsGroup);
            }
        });
    });

    changeActiveFloor(0);
}

function createVShapedStaircase(x, z, startY, height, parentGroup, floorIdx) {
    const stairGroup = new THREE.Group();
    stairGroup.position.set(x, startY, z);
    parentGroup.add(stairGroup);

    const flightHeight = height / 2;
    const numSteps = 16;
    const risePerStep = flightHeight / numSteps;
    const runPerStep = 0.45;
    const stepWidth = 1.8;
    const stepHeight = 0.22;
    const stepDepth = 0.45;

    const stepMat = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        metalness: 0.8,
        roughness: 0.3,
        transparent: true
    });

    const landingMat = new THREE.MeshStandardMaterial({
        color: 0x07111e,
        metalness: 0.8,
        roughness: 0.3,
        transparent: true
    });

    const cyanRibbonMat = new THREE.MeshStandardMaterial({
        color: 0x00f0ff,
        emissive: 0x00f0ff,
        emissiveIntensity: 1.6,
        roughness: 0.1,
        transparent: true,
        opacity: 0.95
    });

    const handrailMat = new THREE.LineBasicMaterial({
        color: 0x00f0ff,
        linewidth: 2.5
    });

    const flight1X = -1.05;
    const flight2X = 1.05;
    const startZ = -4.0;

    for (let i = 0; i < numSteps; i++) {
        const stepY = i * risePerStep + stepHeight / 2;
        const stepZ = startZ + i * runPerStep;

        const step = new THREE.Mesh(new THREE.BoxGeometry(stepWidth, stepHeight, stepDepth), stepMat);
        step.position.set(flight1X, stepY, stepZ);
        stairGroup.add(step);

        const nosing = new THREE.Mesh(new THREE.BoxGeometry(stepWidth + 0.04, 0.04, 0.06), cyanRibbonMat);
        nosing.position.set(flight1X, stepY + stepHeight / 2 - 0.02, stepZ - stepDepth / 2 + 0.03);
        stairGroup.add(nosing);

        const outerEdge = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, stepDepth), cyanRibbonMat);
        outerEdge.position.set(flight1X - stepWidth / 2 - 0.025, stepY + stepHeight / 2 - 0.02, stepZ);
        stairGroup.add(outerEdge);

        step.userData = {
            type: 'staircase',
            floorIdx: floorIdx,
            meta: {
                id: `Internal_V_Staircase_flr${floorIdx}`,
                name: `Internal V-Shaped Staircase (FLR ${floorIdx + 1} ➔ FLR ${floorIdx + 2})`,
                status: 'SECURE',
                occupancy: 'CLEAR',
                temp: '21.0°C',
                power: '0.1 kW',
                desc: `2-flight V-shaped internal staircase connecting FLR ${floorIdx + 1} and FLR ${floorIdx + 2}.`
            }
        };
        interactiveMeshes.push(step);
    }

    const landingWidth = (stepWidth * 2) + 0.3;
    const landingDepth = 2.0;
    const landingZ = startZ + (numSteps * runPerStep) + (landingDepth / 2) - 0.2;
    const landingY = flightHeight - 0.06;

    const landing = new THREE.Mesh(new THREE.BoxGeometry(landingWidth, 0.12, landingDepth), landingMat);
    landing.position.set(0, landingY, landingZ);
    stairGroup.add(landing);

    const landingFrontRibbon = new THREE.Mesh(new THREE.BoxGeometry(landingWidth + 0.05, 0.05, 0.06), cyanRibbonMat);
    landingFrontRibbon.position.set(0, landingY + 0.06, landingZ + landingDepth / 2 - 0.03);
    stairGroup.add(landingFrontRibbon);

    const landingBackRibbon = new THREE.Mesh(new THREE.BoxGeometry(landingWidth + 0.05, 0.05, 0.06), cyanRibbonMat);
    landingBackRibbon.position.set(0, landingY + 0.06, landingZ - landingDepth / 2 + 0.03);
    stairGroup.add(landingBackRibbon);

    for (let i = 0; i < numSteps; i++) {
        const stepY = flightHeight + i * risePerStep + stepHeight / 2;
        const stepZ = (landingZ - landingDepth / 2) - i * runPerStep;

        const step = new THREE.Mesh(new THREE.BoxGeometry(stepWidth, stepHeight, stepDepth), stepMat);
        step.position.set(flight2X, stepY, stepZ);
        stairGroup.add(step);

        const nosing = new THREE.Mesh(new THREE.BoxGeometry(stepWidth + 0.04, 0.04, 0.06), cyanRibbonMat);
        nosing.position.set(flight2X, stepY + stepHeight / 2 - 0.02, stepZ + stepDepth / 2 - 0.03);
        stairGroup.add(nosing);

        const outerEdge = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, stepDepth), cyanRibbonMat);
        outerEdge.position.set(flight2X + stepWidth / 2 + 0.025, stepY + stepHeight / 2 - 0.02, stepZ);
        stairGroup.add(outerEdge);

        step.userData = {
            type: 'staircase',
            floorIdx: floorIdx,
            meta: {
                id: `Internal_V_Staircase_flr${floorIdx}`,
                name: `Internal V-Shaped Staircase (FLR ${floorIdx + 1} ➔ FLR ${floorIdx + 2})`,
                status: 'SECURE',
                occupancy: 'CLEAR',
                temp: '21.0°C',
                power: '0.1 kW',
                desc: `2-flight V-shaped internal staircase connecting FLR ${floorIdx + 1} and FLR ${floorIdx + 2}.`
            }
        };
        interactiveMeshes.push(step);
    }

    const upperLandingWidth = stepWidth + 0.2;
    const upperLandingDepth = 1.5;
    const upperLandingZ = startZ - 0.75;
    const upperLandingY = height - 0.06;

    const upperLanding = new THREE.Mesh(new THREE.BoxGeometry(upperLandingWidth, 0.12, upperLandingDepth), landingMat);
    upperLanding.position.set(flight2X, upperLandingY, upperLandingZ);
    stairGroup.add(upperLanding);

    const upperRibbon = new THREE.Mesh(new THREE.BoxGeometry(upperLandingWidth + 0.05, 0.06, 0.08), cyanRibbonMat);
    upperRibbon.position.set(flight2X, upperLandingY + 0.06, upperLandingZ - upperLandingDepth / 2 + 0.04);
    stairGroup.add(upperRibbon);

    const railPoints = [];
    for (let i = 0; i < numSteps; i++) {
        railPoints.push(new THREE.Vector3(flight1X - stepWidth / 2 - 0.05, i * risePerStep + 0.9, startZ + i * runPerStep));
    }
    railPoints.push(new THREE.Vector3(flight1X - stepWidth / 2 - 0.05, flightHeight + 0.9, landingZ + landingDepth / 2));
    railPoints.push(new THREE.Vector3(flight2X + stepWidth / 2 + 0.05, flightHeight + 0.9, landingZ + landingDepth / 2));
    for (let i = 0; i < numSteps; i++) {
        railPoints.push(new THREE.Vector3(flight2X + stepWidth / 2 + 0.05, flightHeight + i * risePerStep + 0.9, (landingZ - landingDepth / 2) - i * runPerStep));
    }
    railPoints.push(new THREE.Vector3(flight2X + stepWidth / 2 + 0.05, height + 0.9, upperLandingZ - upperLandingDepth / 2));

    const railGeo = new THREE.BufferGeometry().setFromPoints(railPoints);
    const railLine = new THREE.Line(railGeo, handrailMat);
    stairGroup.add(railLine);

    const anchorPos = new THREE.Vector3(x, startY + 4.2, z);
    createHUDLabel(`Internal_V_Staircase_flr${floorIdx}`, 'INTERNAL V-STAIR', anchorPos, 'SECURE', floorIdx);
}

function createEastExitDoorway(x, z, startY, parentGroup) {
    const exitGroup = new THREE.Group();
    exitGroup.position.set(x, startY, z);
    parentGroup.add(exitGroup);

    // ── 1. PROPER HALLWAY CORRIDOR CONNECTING EXIT TO MAIN ROAD (z: -27.5 to z: -38.0) ──
    const hallwayWidth = 5.2;
    const hallwayDepth = 10.5; // Extends from exit to road
    const hallwayFloorMat = new THREE.MeshStandardMaterial({
        color: 0x0f2b3e,
        emissive: 0x002d44,
        emissiveIntensity: 0.8,
        metalness: 0.7,
        roughness: 0.3
    });

    // Hallway floor slab extending to road
    const hallwaySlab = new THREE.Mesh(new THREE.BoxGeometry(hallwayWidth, 0.2, hallwayDepth), hallwayFloorMat);
    hallwaySlab.position.set(0, -0.1, -hallwayDepth / 2);
    exitGroup.add(hallwaySlab);

    // Glowing Neon Guide Rails along both sides of hallway corridor
    const railGlowMat = new THREE.MeshStandardMaterial({
        color: 0x00f0ff,
        emissive: 0x00f0ff,
        emissiveIntensity: 2.0
    });
    const leftRail = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.4, hallwayDepth), railGlowMat);
    leftRail.position.set(-hallwayWidth / 2, 0.2, -hallwayDepth / 2);
    exitGroup.add(leftRail);

    const rightRail = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.4, hallwayDepth), railGlowMat);
    rightRail.position.set(hallwayWidth / 2, 0.2, -hallwayDepth / 2);
    exitGroup.add(rightRail);

    // LED Bollard Lights along hallway to road
    for (let b = 0; b <= 3; b++) {
        const bZ = -b * (hallwayDepth / 3);
        const bollardGeo = new THREE.CylinderGeometry(0.12, 0.15, 1.2, 8);
        const bMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 });
        
        const bLeft = new THREE.Mesh(bollardGeo, bMat);
        bLeft.position.set(-hallwayWidth / 2 - 0.2, 0.6, bZ);
        exitGroup.add(bLeft);

        const bRight = new THREE.Mesh(bollardGeo, bMat);
        bRight.position.set(hallwayWidth / 2 + 0.2, 0.6, bZ);
        exitGroup.add(bRight);

        const capGlow = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.15, 8), railGlowMat);
        capGlow.position.set(-hallwayWidth / 2 - 0.2, 1.25, bZ);
        exitGroup.add(capGlow);

        const capGlowR = capGlow.clone();
        capGlowR.position.set(hallwayWidth / 2 + 0.2, 1.25, bZ);
        exitGroup.add(capGlowR);
    }

    // Road Junction Crosswalk Ramp
    const rampMat = new THREE.MeshStandardMaterial({ color: 0xff9e00, emissive: 0xff9e00, emissiveIntensity: 1.2 });
    const rampBar = new THREE.Mesh(new THREE.BoxGeometry(hallwayWidth + 1.0, 0.08, 1.0), rampMat);
    rampBar.position.set(0, 0.04, -hallwayDepth);
    exitGroup.add(rampBar);

    // ── 2. HIGHLIGHTED EXIT PORTAL & ARCHWAY ──
    const stairMat = new THREE.MeshStandardMaterial({ color: 0x1e293c, metalness: 0.8, roughness: 0.4 });
    const numSteps = 6;
    const stepWidth = 4.2;
    const stepHeight = 0.15;
    const stepDepth = 0.4;
    for (let i = 0; i < numSteps; i++) {
        const step = new THREE.Mesh(new THREE.BoxGeometry(stepWidth, stepHeight, stepDepth), stairMat);
        step.position.set(0, (numSteps - 1 - i) * stepHeight + stepHeight / 2, -i * stepDepth);
        exitGroup.add(step);
    }

    // High-visibility pillars & illuminated canopy
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x0b324d, metalness: 0.8, roughness: 0.2 });
    const pillarGlowMat = new THREE.MeshStandardMaterial({ color: 0xff9e00, emissive: 0xff9e00, emissiveIntensity: 1.8 });

    const pillarLeft = new THREE.Mesh(new THREE.BoxGeometry(0.6, 4.2, 0.6), pillarMat);
    pillarLeft.position.set(-2.3, 2.1, 0);
    exitGroup.add(pillarLeft);

    const pillarRight = new THREE.Mesh(new THREE.BoxGeometry(0.6, 4.2, 0.6), pillarMat);
    pillarRight.position.set(2.3, 2.1, 0);
    exitGroup.add(pillarRight);

    // Pillar Glow Strips
    const pStripL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 4.0, 0.62), pillarGlowMat);
    pStripL.position.set(-2.35, 2.1, 0);
    exitGroup.add(pStripL);

    const pStripR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 4.0, 0.62), pillarGlowMat);
    pStripR.position.set(2.35, 2.1, 0);
    exitGroup.add(pStripR);

    // Overhead Exit Canopy
    const topBeam = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.6, 1.2), pillarMat);
    topBeam.position.set(0, 4.2, 0);
    exitGroup.add(topBeam);

    // Glowing Neon EXIT Sign
    const exitGlow = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.35, 0.15), railGlowMat);
    exitGlow.position.set(0, 4.2, -0.61);
    exitGroup.add(exitGlow);

    // High Intensity Dual Lights (Cyan + Amber)
    const pLightCyan = new THREE.PointLight(0x00f0ff, 3.5, 15);
    pLightCyan.position.set(0, 3.0, -1.0);
    exitGroup.add(pLightCyan);

    const pLightAmber = new THREE.PointLight(0xff9e00, 2.5, 10);
    pLightAmber.position.set(0, 1.5, -5.0);
    exitGroup.add(pLightAmber);

    // Dynamic HUD Label removed as requested
}

function createGrandEntranceStaircase(x, z, startY, height, parentGroup) {
    const stairGroup = new THREE.Group();
    stairGroup.position.set(x, startY, z);
    parentGroup.add(stairGroup);

    const stepWidth = 1.5;
    const stepHeight = 0.15;
    const stepDepth = 0.35;
    const numSteps = 12;
    const flightHeight = height / 2;
    const risePerStep = flightHeight / numSteps;
    const runX = 3.5 / numSteps;

    const stairMat = new THREE.MeshStandardMaterial({ color: 0x1e293c, metalness: 0.8, roughness: 0.4, transparent: true });
    const landingMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8, roughness: 0.3, transparent: true });

    for (let i = 0; i < numSteps; i++) {
        const step = new THREE.Mesh(new THREE.BoxGeometry(stepDepth, stepHeight, stepWidth), stairMat);
        step.position.set(-4.5 + i * runX, i * risePerStep + stepHeight/2, -2.0 + (i * 1.0 / numSteps));
        stairGroup.add(step);
    }

    for (let i = 0; i < numSteps; i++) {
        const step = new THREE.Mesh(new THREE.BoxGeometry(stepDepth, stepHeight, stepWidth), stairMat);
        step.position.set(4.5 - i * runX, i * risePerStep + stepHeight/2, -2.0 + (i * 1.0 / numSteps));
        stairGroup.add(step);
    }

    const landing = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.12, 2.5), landingMat);
    landing.position.set(0, flightHeight - 0.06, -0.25);
    stairGroup.add(landing);

    const runZ = 3.5 / numSteps;
    for (let i = 0; i < numSteps; i++) {
        const step = new THREE.Mesh(new THREE.BoxGeometry(2.2, stepHeight, stepDepth), stairMat);
        step.position.set(0, flightHeight + i * risePerStep + stepHeight/2, 1.0 + i * runZ);
        stairGroup.add(step);
    }

    const leftRailPoints = [];
    for (let i = 0; i < numSteps; i++) {
        leftRailPoints.push(new THREE.Vector3(-4.5 + i * runX, i * risePerStep + 0.9, -2.0 + (i * 1.0 / numSteps)));
    }
    leftRailPoints.push(new THREE.Vector3(-1.0, flightHeight + 0.9, -0.25));
    leftRailPoints.push(new THREE.Vector3(-1.0, flightHeight + 0.9, 1.0));
    for (let i = 0; i < numSteps; i++) {
        leftRailPoints.push(new THREE.Vector3(-1.1, flightHeight + i * risePerStep + 0.9, 1.0 + i * runZ));
    }

    const rightRailPoints = [];
    for (let i = 0; i < numSteps; i++) {
        rightRailPoints.push(new THREE.Vector3(4.5 - i * runX, i * risePerStep + 0.9, -2.0 + (i * 1.0 / numSteps)));
    }
    rightRailPoints.push(new THREE.Vector3(1.0, flightHeight + 0.9, -0.25));
    rightRailPoints.push(new THREE.Vector3(1.0, flightHeight + 0.9, 1.0));
    for (let i = 0; i < numSteps; i++) {
        rightRailPoints.push(new THREE.Vector3(1.1, flightHeight + i * risePerStep + 0.9, 1.0 + i * runZ));
    }

    const railMat = new THREE.LineBasicMaterial({ color: 0x00f0ff, linewidth: 2 });

    const leftRailGeo = new THREE.BufferGeometry().setFromPoints(leftRailPoints);
    const leftRailLine = new THREE.Line(leftRailGeo, railMat);
    stairGroup.add(leftRailLine);

    const rightRailGeo = new THREE.BufferGeometry().setFromPoints(rightRailPoints);
    const rightRailLine = new THREE.Line(rightRailGeo, railMat);
    stairGroup.add(rightRailLine);
}

function createCentralTowerStaircase(x, z, startY, height, parentGroup) {
    const stairGroup = new THREE.Group();
    stairGroup.position.set(x, startY, z);
    parentGroup.add(stairGroup);

    const stairsMat = new THREE.MeshStandardMaterial({ color: 0x00e5ff, metalness: 0.8, roughness: 0.3, transparent: true, opacity: 0.8 });
    const shaftMat = new THREE.MeshStandardMaterial({ color: 0x00f0ff, metalness: 0.2, roughness: 0.1, transparent: true, opacity: 0.15, side: THREE.DoubleSide });

    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, height, 16, 1, true), shaftMat);
    shaft.position.set(0, height / 2, 0);
    stairGroup.add(shaft);

    const numSteps = 24;
    const stepAngle = (Math.PI * 2) * 2 / numSteps;
    const stepHeight = height / numSteps;
    
    for (let i = 0; i < numSteps; i++) {
        const stepGeo = new THREE.BoxGeometry(1.6, 0.08, 0.3);
        const step = new THREE.Mesh(stepGeo, stairsMat);
        
        const angle = i * stepAngle;
        const radius = 0.7;
        step.position.set(Math.cos(angle) * radius, i * stepHeight + 0.04, Math.sin(angle) * radius);
        step.rotation.y = -angle;
        stairGroup.add(step);
    }

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, height, 8), stairsMat);
    pole.position.set(0, height / 2, 0);
    stairGroup.add(pole);
}

function createHUDLabel(id, text, worldPos, type, floorIdx, theme = '', isMacroLabel = false, roomSector = '', isLandmarkLabel = false) {
    const container = document.getElementById('hud-labels-container');
    if (!container) return;
    
    const labelDiv = document.createElement('div');
    labelDiv.className = 'hud-label';
    labelDiv.id = `label-${id}`;
    labelDiv.dataset.floorIdx = floorIdx;

    let themeClass = '';
    if (type === 'WARNING') themeClass = 'orange-theme';
    else if (type === 'MAINTENANCE') themeClass = 'purple-theme';
    else if (type === 'PORTAL-A') themeClass = 'purple-theme';
    else if (type === 'PORTAL-C') themeClass = 'orange-theme';
    else if (type === 'PORTAL-PG') themeClass = 'purple-theme';

    labelDiv.innerHTML = `
        <div class="hud-badge ${themeClass}" id="badge-${id}">
            <span class="hud-badge-dot"></span>
            <span class="hud-badge-name">${text}</span>
        </div>
        <div class="hud-line"></div>
        <div class="hud-anchor"></div>
    `;
    container.appendChild(labelDiv);

    const badge = labelDiv.querySelector('.hud-badge');
    badge.addEventListener('click', (e) => {
        e.stopPropagation();
        focusNodeIn3D(id, floorIdx);
    });

    labelsList.push({
        id: id,
        domElement: labelDiv,
        worldPosition: worldPos,
        floorIdx: floorIdx,
        isMacroLabel: isMacroLabel,
        roomSector: roomSector,
        isLandmarkLabel: isLandmarkLabel
    });
}


function openSidebar(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    document.body.classList.add('hud-open');
    const hudToggleBtn = document.getElementById('btn-toggle-hud');
    if (hudToggleBtn) hudToggleBtn.classList.add('active');
    const icon = document.getElementById('hud-toggle-icon');
    const text = document.getElementById('hud-toggle-text');
    if (icon) icon.className = 'fa-solid fa-xmark';
    if (text) text.innerText = 'CLOSE';
}

function closeSidebar(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    document.body.classList.remove('hud-open');
    const hudToggleBtn = document.getElementById('btn-toggle-hud');
    if (hudToggleBtn) hudToggleBtn.classList.remove('active');
    const icon = document.getElementById('hud-toggle-icon');
    const text = document.getElementById('hud-toggle-text');
    if (icon) icon.className = 'fa-solid fa-bars';
    if (text) text.innerText = 'MENU';
    const dropMenu = document.getElementById('block-dropdown-menu');
    if (dropMenu) dropMenu.classList.add('hidden');
}

function toggleSidebar(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (document.body.classList.contains('hud-open')) {
        closeSidebar(e);
    } else {
        openSidebar(e);
    }
}

window.openSidebar = openSidebar;
window.closeSidebar = closeSidebar;
window.toggleSidebar = toggleSidebar;

function setupBlockDropdown() {
    const toggleBtn = document.getElementById('block-dropdown-toggle');
    const menu = document.getElementById('block-dropdown-menu');
    if (!toggleBtn || !menu) return;

    toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = !menu.classList.contains('hidden');
        if (isOpen) {
            menu.classList.add('hidden');
            toggleBtn.classList.remove('open');
        } else {
            menu.classList.remove('hidden');
            toggleBtn.classList.add('open');
        }
    });

    document.addEventListener('click', () => {
        menu.classList.add('hidden');
        toggleBtn.classList.remove('open');
    });

    const optionBtns = document.querySelectorAll('.block-option-btn');
    optionBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const sector = btn.dataset.sector;

            optionBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const labelEl = document.getElementById('block-dropdown-label');
            if (labelEl) labelEl.textContent = sector;

            menu.classList.add('hidden');
            toggleBtn.classList.remove('open');

            selectBlock(sector);
        });
    });
}

function selectBlock(sector) {
    isTransitioning = false;
    selectedBlock = sector;
    activeSector = sector;

    // Synchronize UI dropdown button label and active states
    const labelEl = document.getElementById('block-dropdown-label');
    if (labelEl) labelEl.textContent = sector;

    const optionBtns = document.querySelectorAll('.block-option-btn');
    optionBtns.forEach(btn => {
        if (btn.dataset.sector === sector) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Display level selector and update sector display card
    const lvlSection = document.getElementById('level-selector-section');
    if (lvlSection) lvlSection.style.display = '';

    const sectorDisplay = document.getElementById('active-sector-display');
    if (sectorDisplay) sectorDisplay.innerText = sector;

    updateFloorButtonLabels();
    focusSector(sector);
    changeActiveFloor(activeFloorIndex);
}

function switchSector(sector) {
    selectBlock(sector);
}

function updateFloorButtonLabels() {
    const buttons = document.querySelectorAll('.floor-btn');
    const pgFloorNames = ['PG-G', 'PG-1', 'PG-2', 'PG-3', 'PG-4'];
    const dFloorNames = ['D-G', 'D-1', 'D-2', 'D-3', 'D-4'];
    const eFloorNames = ['E-G', 'E-1', 'E-2', 'E-3', 'E-4'];
    const bFloorNames = ['FLR 1', 'FLR 2', 'FLR 3', 'FLR 4', 'FLR 5'];

    buttons.forEach((btn, idx) => {
        if (activeSector === 'PG-BLOCK') {
            btn.innerText = pgFloorNames[idx] || `PG-${idx}`;
        } else if (activeSector === 'D-BLOCK') {
            btn.innerText = dFloorNames[idx] || `D-${idx}`;
        } else if (activeSector === 'E-BLOCK') {
            btn.innerText = eFloorNames[idx] || `E-${idx}`;
        } else {
            btn.innerText = bFloorNames[idx] || `FLR ${idx + 1}`;
        }
    });
}

function focusSector(sector) {
    const targetY = (campusData && campusData.floors[activeFloorIndex]) ? campusData.floors[activeFloorIndex].elevation : 0;
    
    if (sector === 'PG-BLOCK') {
        gsap.to(controls.target, { x: 95.0, y: targetY + 0.5, z: 17.5, duration: 1.2, ease: "power2.out", onUpdate: () => controls.update() });
        gsap.to(camera.position, { x: 135.0, y: targetY + 36.0, z: -36.0, duration: 1.2, ease: "power2.out" });
    } else if (sector === 'A-BLOCK') {
        gsap.to(controls.target, { x: -20.0, y: targetY + 0.5, z: 10.0, duration: 1.2, ease: "power2.out", onUpdate: () => controls.update() });
        gsap.to(camera.position, { x: 20.0, y: targetY + 36.0, z: -40.0, duration: 1.2, ease: "power2.out" });
    } else if (sector === 'C-BLOCK') {
        gsap.to(controls.target, { x: -42.0, y: targetY + 0.5, z: 10.0, duration: 1.2, ease: "power2.out", onUpdate: () => controls.update() });
        gsap.to(camera.position, { x: -10.0, y: targetY + 36.0, z: -40.0, duration: 1.2, ease: "power2.out" });
    } else {
        gsap.to(controls.target, { x: -3.0, y: targetY + 0.5, z: 5.0, duration: 1.2, ease: "power2.out", onUpdate: () => controls.update() });
        gsap.to(camera.position, { x: 35.0, y: targetY + 32.0, z: -49.0, duration: 1.2, ease: "power2.out" });
    }
}

function buildSkybridge(flGroup, conn, idx, flData) {
    const bridgeGroup = new THREE.Group();
    bridgeGroup.position.set(conn.x, 0.15, conn.z);
    flGroup.add(bridgeGroup);

    const deckGeo = new THREE.BoxGeometry(conn.w, 0.25, conn.d);
    const deckMat = new THREE.MeshStandardMaterial({
        color: 0x0a1428,
        emissive: 0x021020,
        roughness: 0.3,
        metalness: 0.8,
        transparent: true,
        opacity: 0.95
    });
    const deckMesh = new THREE.Mesh(deckGeo, deckMat);
    bridgeGroup.add(deckMesh);

    const stripGeo = new THREE.BoxGeometry(conn.w, 0.05, 0.6);
    const stripMat = new THREE.MeshStandardMaterial({
        color: 0x00f0ff,
        emissive: 0x00f0ff,
        emissiveIntensity: 2.0,
        transparent: true,
        opacity: 0.95
    });
    const stripMesh = new THREE.Mesh(stripGeo, stripMat);
    stripMesh.position.y = 0.14;
    bridgeGroup.add(stripMesh);

    const railHeight = 1.2;
    const railGeo = new THREE.BoxGeometry(conn.w, railHeight, 0.1);
    const glassMat = new THREE.MeshStandardMaterial({
        color: 0x00f0ff,
        opacity: 0.25,
        transparent: true,
        roughness: 0.1,
        metalness: 0.1,
        depthWrite: false
    });

    const railNorth = new THREE.Mesh(railGeo, glassMat);
    railNorth.position.set(0, railHeight / 2 + 0.1, -conn.d / 2 + 0.05);
    bridgeGroup.add(railNorth);

    const railSouth = new THREE.Mesh(railGeo, glassMat);
    railSouth.position.set(0, railHeight / 2 + 0.1, conn.d / 2 - 0.05);
    bridgeGroup.add(railSouth);

    const edgeGeo = new THREE.BoxGeometry(conn.w, 0.08, 0.15);
    const edgeMat = new THREE.MeshStandardMaterial({
        color: 0x00f0ff,
        emissive: 0x00f0ff,
        emissiveIntensity: 2.2,
        transparent: true,
        opacity: 0.95
    });

    const topRailNorth = new THREE.Mesh(edgeGeo, edgeMat);
    topRailNorth.position.set(0, railHeight + 0.1, -conn.d / 2 + 0.05);
    bridgeGroup.add(topRailNorth);

    const topRailSouth = new THREE.Mesh(edgeGeo, edgeMat);
    topRailSouth.position.set(0, railHeight + 0.1, conn.d / 2 - 0.05);
    bridgeGroup.add(topRailSouth);

    const botRailNorth = new THREE.Mesh(edgeGeo, edgeMat);
    botRailNorth.position.set(0, 0.05, -conn.d / 2 + 0.05);
    bridgeGroup.add(botRailNorth);

    const botRailSouth = new THREE.Mesh(edgeGeo, edgeMat);
    botRailSouth.position.set(0, 0.05, conn.d / 2 - 0.05);
    bridgeGroup.add(botRailSouth);

    const startNodeMat = baseMaterials.portalPG.clone();
    const cGroup = new THREE.Group();
    cGroup.position.set(conn.start.x, 0.8, conn.start.z);
    flGroup.add(cGroup);

    const cGeo = new THREE.IcosahedronGeometry(0.7, 1);
    const cMesh = new THREE.Mesh(cGeo, startNodeMat);
    cGroup.add(cMesh);

    const ringGeo = new THREE.TorusGeometry(1.1, 0.06, 8, 30);
    const ringMat = new THREE.MeshBasicMaterial({ color: startNodeMat.color, transparent: true, opacity: 0.6 });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2;
    cGroup.add(ringMesh);

    const pLight = new THREE.PointLight(startNodeMat.color, 2.0, 8);
    cGroup.add(pLight);

    cMesh.userData = {
        type: 'connector',
        floorIdx: idx,
        id: conn.id,
        name: conn.name,
        target: conn.target,
        ringMesh: ringMesh,
        pLight: pLight
    };

    interactiveMeshes.push(cMesh);
    animatedConnectors.push(cMesh);

    const anchorPos = new THREE.Vector3(conn.x, flData.elevation + 2.5, conn.z);
    createHUDLabel(conn.id, conn.name, anchorPos, 'ACTIVE', idx, 'PORTAL-PG');
}

function createBuildingShells() {
    try {
        buildingShellsList = [];

    const shellMat = new THREE.MeshStandardMaterial({
        color: 0x0f324d,
        emissive: 0x003859,
        emissiveIntensity: 0.8,
        roughness: 0.3,
        metalness: 0.7,
        transparent: true,
        opacity: 0.85,
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1
    });

    const edgeLineMat = new THREE.LineBasicMaterial({
        color: 0x00f0ff,
        transparent: true,
        opacity: 1.0
    });

    const buildingsData = [
        {
            name: "A-B-C Connected Complex",
            sector: "B-BLOCK",
            x: -2.5, y: 20.0, z: 9.0,
            w: 98, h: 40, d: 75,
            label: "A - B - C"
        },
        {
            name: "PG Block",
            sector: "PG-BLOCK",
            x: 95.0, y: 20.0, z: 20.0,
            w: 32, h: 40, d: 58,
            label: "PG"
        },
        {
            name: "D Block",
            sector: "D-BLOCK",
            x: 95.0, y: 20.0, z: -75.0,
            w: 32, h: 40, d: 58,
            label: "D"
        },
        {
            name: "E Block",
            sector: "E-BLOCK",
            x: -75.0, y: 20.0, z: -75.0,
            w: 32, h: 40, d: 58,
            label: "E"
        },
        {
            name: "PEB Block",
            sector: "PEB",
            x: -420.0, y: 5.0, z: 130.0,
            w: 35, h: 10, d: 25,
            label: "PEB BLOCK"
        }
    ];

    buildingsData.forEach(b => {
        const group = new THREE.Group();
        group.position.set(b.x, b.y, b.z);

        const geo = new THREE.BoxGeometry(b.w, b.h, b.d);
        const meshMat = shellMat.clone();
        const mesh = new THREE.Mesh(geo, meshMat);

        mesh.userData = {
            type: 'buildingShell',
            sector: b.sector,
            name: b.name,
            shellMesh: mesh,
            parentGroup: group
        };

        group.add(mesh);
        interactiveMeshes.push(mesh);
        buildingShellsList.push(mesh);

        const numFloors = b.h > 12 ? 5 : 2;
        const floorH = b.h / numFloors;
        for (let i = 1; i < numFloors; i++) {
            const yOffset = -b.h / 2 + i * floorH;
            const lineGeo = new THREE.BufferGeometry();
            const halfW = b.w / 2 + 0.05;
            const halfD = b.d / 2 + 0.05;
            
            const points = [
                new THREE.Vector3(-halfW, yOffset, -halfD),
                new THREE.Vector3(halfW, yOffset, -halfD),
                new THREE.Vector3(halfW, yOffset, halfD),
                new THREE.Vector3(-halfW, yOffset, halfD),
                new THREE.Vector3(-halfW, yOffset, -halfD)
            ];
            lineGeo.setFromPoints(points);
            const line = new THREE.Line(lineGeo, edgeLineMat);
            group.add(line);
        }

        const roofOutlineGeo = new THREE.BufferGeometry();
        const halfW = b.w / 2 + 0.08;
        const halfD = b.d / 2 + 0.08;
        const roofY = b.h / 2 + 0.05;
        const roofPoints = [
            new THREE.Vector3(-halfW, roofY, -halfD),
            new THREE.Vector3(halfW, roofY, -halfD),
            new THREE.Vector3(halfW, roofY, halfD),
            new THREE.Vector3(-halfW, roofY, halfD),
            new THREE.Vector3(-halfW, roofY, -halfD)
        ];
        roofOutlineGeo.setFromPoints(roofPoints);
        const roofLine = new THREE.Line(roofOutlineGeo, edgeLineMat);
        group.add(roofLine);

        const labelPos = new THREE.Vector3(b.x, b.y + b.h / 2 + 3.0, b.z);
        createHUDLabel(`shell-${b.sector}`, b.label, labelPos, 'SECURE', 0, 'CYAN', true);

        if (scene) scene.add(group);
    });
    } catch(err) {
        console.warn("createBuildingShells notice:", err);
    }
}

function buildGroundNetwork() {
    const networkGroup = new THREE.Group();

    const nodes = [
        { id: "a_block_node", name: "A Block",   x:  35,   z:  35   },
        { id: "b_block_node", name: "B Block",   x:   0,   z:  15   },
        { id: "c_block_node", name: "C Block",   x: -35,   z:   5   },
        { id: "pg_node",      name: "PG Block",  x:  95,   z:  20   },
        { id: "jsk_node",     name: "JSK Greens",x:  95,   z: -27.5 },
        { id: "d_node",       name: "D Block",   x:  95,   z: -75   },
        { id: "e_node",       name: "E Block",   x: -75,   z: -75   }
    ];

    const ringGeo = new THREE.TorusGeometry(2.5, 0.25, 8, 24);
    const nodeMat = new THREE.MeshStandardMaterial({
        color: 0x00e676,
        emissive: 0x00e676,
        emissiveIntensity: 1.5,
        transparent: true,
        opacity: 0.9
    });

    nodes.forEach(n => {
        const ring = new THREE.Mesh(ringGeo, nodeMat);
        ring.position.set(n.x, 0.1, n.z);
        ring.rotation.x = Math.PI / 2;
        networkGroup.add(ring);

        const labelPos = new THREE.Vector3(n.x, 2.5, n.z);
        createHUDLabel(`node-${n.id}`, n.name, labelPos, 'SECURE', 0, 'GREEN', true);
    });

    const connections = [
        { from: "c_block_node", to: "b_block_node" },
        { from: "b_block_node", to: "a_block_node", active: true },
        { from: "a_block_node", to: "pg_node" },
        { from: "pg_node",      to: "jsk_node" },
        { from: "jsk_node",     to: "d_node" },
        { from: "c_block_node", to: "e_node" }
    ];

    const lineMatGreen  = new THREE.LineBasicMaterial({ color: 0x00e676, transparent: true, opacity: 0.85 });
    const lineMatActive = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1.0 });

    connections.forEach(conn => {
        const n1 = nodes.find(n => n.id === conn.from);
        const n2 = nodes.find(n => n.id === conn.to);
        if (!n1 || !n2) return;
        const pts = [
            new THREE.Vector3(n1.x, 0.15, n1.z),
            new THREE.Vector3(n2.x, 0.15, n2.z)
        ];
        const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
        const line = new THREE.Line(lineGeo, conn.active ? lineMatActive : lineMatGreen);
        networkGroup.add(line);
    });

    if (scene) scene.add(networkGroup);
}

function buildGroundAndParking() {
    const group = new THREE.Group();

    const X_CANTEEN = -125;
    const X_PEB     = -420;
    const TOTAL_X   = X_PEB - X_CANTEEN;
    const Z_SOUTH   =   8;
    const Z_NORTH   = 122;
    const DEPTH_Z   = Z_NORTH - Z_SOUTH;
    const CENTER_Z  = (Z_SOUTH + Z_NORTH) / 2;

    const LAWN_W    = Math.abs(TOTAL_X) * 0.75;
    const PARK_W    = Math.abs(TOTAL_X) * 0.25;
    const X_DIVIDE  = X_CANTEEN + TOTAL_X * 0.75;

    const LAWN_CX   = (X_CANTEEN + X_DIVIDE) / 2;
    const PARK_CX   = (X_DIVIDE + X_PEB) / 2;

    const lawnMat = new THREE.MeshStandardMaterial({
        color: 0x0a1a0f,
        emissive: 0x02100a,
        emissiveIntensity: 0.25,
        roughness: 0.95,
        metalness: 0.0
    });
    const lawn = new THREE.Mesh(
        new THREE.BoxGeometry(LAWN_W, 0.18, DEPTH_Z),
        lawnMat
    );
    lawn.position.set(LAWN_CX, 0.09, CENTER_Z);
    group.add(lawn);

    const lawnEdgeMat = new THREE.MeshStandardMaterial({
        color: 0x00e676, emissive: 0x00e676, emissiveIntensity: 1.0, transparent: true, opacity: 0.6
    });
    const eastBorder = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.12, DEPTH_Z), lawnEdgeMat);
    eastBorder.position.set(X_CANTEEN - 0.12, 0.25, CENTER_Z);
    group.add(eastBorder);
    const divBorder = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.12, DEPTH_Z), lawnEdgeMat);
    divBorder.position.set(X_DIVIDE, 0.25, CENTER_Z);
    group.add(divBorder);

    const asphaltMat = new THREE.MeshStandardMaterial({
        color: 0x0c0e12, roughness: 0.94, metalness: 0.03
    });
    const parking = new THREE.Mesh(
        new THREE.BoxGeometry(PARK_W, 0.2, DEPTH_Z),
        asphaltMat
    );
    parking.position.set(PARK_CX, 0.1, CENTER_Z);
    group.add(parking);

    const bayLineMat = new THREE.MeshStandardMaterial({
        color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.45
    });
    const bayLineBlueMat = new THREE.MeshStandardMaterial({
        color: 0x00b8ff, emissive: 0x00b8ff, emissiveIntensity: 0.9, transparent: true, opacity: 0.85
    });
    const BAY_W = 6.5;
    const BAY_D = DEPTH_Z;
    let bx = X_DIVIDE;
    let bayIdx = 0;
    while (bx > X_PEB + BAY_W * 0.5) {
        bx -= BAY_W;
        const line = new THREE.Mesh(
            new THREE.BoxGeometry(0.2, 0.06, BAY_D),
            bayIdx % 3 === 0 ? bayLineBlueMat : bayLineMat
        );
        line.position.set(bx, 0.22, CENTER_Z);
        group.add(line);
        bayIdx++;
    }

    const stopMat = new THREE.MeshStandardMaterial({
        color: 0xff9e00, emissive: 0xff9e00, emissiveIntensity: 0.7,
        transparent: true, opacity: 0.85
    });
    [Z_SOUTH + DEPTH_Z * 0.28, Z_SOUTH + DEPTH_Z * 0.72].forEach(stopZ => {
        const stop = new THREE.Mesh(
            new THREE.BoxGeometry(PARK_W, 0.22, 0.5),
            stopMat
        );
        stop.position.set(PARK_CX, 0.22, stopZ);
        group.add(stop);
    });

    const parkEdgeMat = new THREE.MeshStandardMaterial({
        color: 0x00b8ff, emissive: 0x00b8ff, emissiveIntensity: 1.2, transparent: true, opacity: 0.8
    });
    const parkWestEdge = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, DEPTH_Z), parkEdgeMat);
    parkWestEdge.position.set(X_PEB + 0.15, 0.25, CENTER_Z);
    group.add(parkWestEdge);

    createHUDLabel(
        'open-ground-label', 'OPEN GROUND',
        new THREE.Vector3(LAWN_CX, 8, CENTER_Z),
        'SECURE', 0, '', false, '', true
    );

    createHUDLabel(
        'parking-lot-label', 'PARKING LOT',
        new THREE.Vector3(PARK_CX, 8, CENTER_Z),
        'SECURE', 0, '', false, '', true
    );

    if (scene) scene.add(group);
}

function buildMainRoad() {
    const roadGroup = new THREE.Group();

    const ROAD_Z     = -38;
    const ROAD_W     = 13;
    const X_EAST     = 118;
    const X_WEST     = -560;
    const ROAD_LEN   = X_EAST - X_WEST;
    const ROAD_CX    = (X_EAST + X_WEST) / 2;

    const CANTEEN_X  = -125;
    const VNR_X      = -330;
    const GATE_X     = -510;

    const asphaltMat = new THREE.MeshStandardMaterial({
        color: 0x0c0f14, roughness: 0.96, metalness: 0.02
    });
    const roadMesh = new THREE.Mesh(
        new THREE.BoxGeometry(ROAD_LEN, 0.22, ROAD_W),
        asphaltMat
    );
    roadMesh.position.set(ROAD_CX, 0.11, ROAD_Z);
    roadGroup.add(roadMesh);

    const kerbMat = new THREE.MeshStandardMaterial({
        color: 0x1a2235, roughness: 0.85
    });
    [-1, 1].forEach(side => {
        const kerb = new THREE.Mesh(
            new THREE.BoxGeometry(ROAD_LEN, 0.18, 0.8),
            kerbMat
        );
        kerb.position.set(ROAD_CX, 0.09, ROAD_Z + side * (ROAD_W / 2 + 0.4));
        roadGroup.add(kerb);
    });

    const neonEdgeMat = new THREE.MeshStandardMaterial({
        color: 0x00f0ff, emissive: 0x00f0ff,
        emissiveIntensity: 1.8, transparent: true, opacity: 0.9
    });
    [-1, 1].forEach(side => {
        const strip = new THREE.Mesh(
            new THREE.BoxGeometry(ROAD_LEN, 0.07, 0.25),
            neonEdgeMat
        );
        strip.position.set(ROAD_CX, 0.24, ROAD_Z + side * (ROAD_W / 2 - 0.15));
        roadGroup.add(strip);
    });

    const DASH_LEN = 6.0;
    const DASH_PERIOD = 12.0;
    const numDashes = Math.floor(ROAD_LEN / DASH_PERIOD);
    const dashPositions = [];
    const dashIndices = [];
    let vi = 0;
    for (let i = 0; i < numDashes; i++) {
        const dx = X_WEST + DASH_LEN / 2 + i * DASH_PERIOD;
        const hw = DASH_LEN / 2, ht = 0.03, hd = 0.18;
        dashPositions.push(
            dx - hw, 0.24, ROAD_Z - hd,
            dx + hw, 0.24, ROAD_Z - hd,
            dx + hw, 0.24, ROAD_Z + hd,
            dx - hw, 0.24, ROAD_Z + hd
        );
        dashIndices.push(vi, vi+1, vi+2, vi, vi+2, vi+3);
        vi += 4;
    }
    const dashGeo = new THREE.BufferGeometry();
    dashGeo.setAttribute('position', new THREE.Float32BufferAttribute(dashPositions, 3));
    dashGeo.setIndex(dashIndices);
    dashGeo.computeVertexNormals();
    const dashMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.5 });
    roadGroup.add(new THREE.Mesh(dashGeo, dashMat));

    const poleMat = new THREE.MeshStandardMaterial({
        color: 0x1a2a3a, metalness: 0.9, roughness: 0.2
    });
    const lampHeadMat = new THREE.MeshStandardMaterial({
        color: 0x00f0ff, emissive: 0x00f0ff,
        emissiveIntensity: 2.5, transparent: true, opacity: 0.9
    });
    const LAMP_SPACING = 44;
    const lampPositionsX = [];
    for (let lx = X_WEST + 12; lx < X_EAST; lx += LAMP_SPACING) lampPositionsX.push(lx);

    lampPositionsX.forEach((lx, idx) => {
        const side = idx % 2 === 0 ? 1 : -1;
        const poleZ = ROAD_Z + side * (ROAD_W / 2 + 1.5);
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 7, 6), poleMat);
        pole.position.set(lx, 3.5, poleZ);
        roadGroup.add(pole);

        const armLen = side * -2.5;
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, Math.abs(armLen)), poleMat);
        arm.position.set(lx, 7.2, poleZ + armLen / 2);
        roadGroup.add(arm);

        const head = new THREE.Mesh(new THREE.SphereGeometry(0.4, 6, 5), lampHeadMat);
        head.position.set(lx, 7.2, poleZ + armLen);
        roadGroup.add(head);
    });

    const canteenBuildMat = new THREE.MeshStandardMaterial({
        color: 0x0d1f2e, emissive: 0x051525,
        emissiveIntensity: 0.5, roughness: 0.45, metalness: 0.55
    });
    const canteenMesh = new THREE.Mesh(
        new THREE.BoxGeometry(22, 6, 15),
        canteenBuildMat
    );
    canteenMesh.position.set(CANTEEN_X, 3.0, ROAD_Z + 18);
    roadGroup.add(canteenMesh);

    const canteenEdgeMat = new THREE.LineBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.85 });
    [
        [[-11,0,-7.5],[11,0,-7.5],[11,0,7.5],[-11,0,7.5],[-11,0,-7.5]]
    ].forEach(pts => {
        const geo = new THREE.BufferGeometry().setFromPoints(pts.map(p => new THREE.Vector3(...p)));
        const line = new THREE.Line(geo, canteenEdgeMat);
        line.position.set(CANTEEN_X, 6.12, ROAD_Z + 18);
        roadGroup.add(line);
    });

    const canteenSignMat = new THREE.MeshStandardMaterial({
        color: 0xff9e00, emissive: 0xff9e00, emissiveIntensity: 2.0, transparent: true, opacity: 0.9
    });
    const canteenSign = new THREE.Mesh(new THREE.BoxGeometry(20, 0.5, 0.2), canteenSignMat);
    canteenSign.position.set(CANTEEN_X, 6.3, ROAD_Z + 10.6);
    roadGroup.add(canteenSign);

    const pathMat = new THREE.MeshStandardMaterial({ color: 0x111820, roughness: 0.9 });
    const canteenPath = new THREE.Mesh(new THREE.BoxGeometry(4, 0.18, 10.5), pathMat);
    canteenPath.position.set(CANTEEN_X, 0.09, ROAD_Z + 11.2);
    roadGroup.add(canteenPath);

    const roundBase = new THREE.Mesh(
        new THREE.CylinderGeometry(12, 12, 0.28, 48),
        new THREE.MeshStandardMaterial({ color: 0x0a1520, roughness: 0.85 })
    );
    roundBase.position.set(VNR_X, 0.14, ROAD_Z);
    roadGroup.add(roundBase);

    const islandMat = new THREE.MeshStandardMaterial({
        color: 0x0a2010, emissive: 0x003010, emissiveIntensity: 0.4, roughness: 0.9
    });
    const island = new THREE.Mesh(new THREE.CylinderGeometry(8.5, 8.5, 0.35, 48), islandMat);
    island.position.set(VNR_X, 0.32, ROAD_Z);
    roadGroup.add(island);

    const vnrRingMat = new THREE.MeshStandardMaterial({
        color: 0x00f0ff, emissive: 0x00f0ff, emissiveIntensity: 2.0, transparent: true, opacity: 0.85
    });
    const vnrRing = new THREE.Mesh(new THREE.TorusGeometry(9.5, 0.4, 10, 56), vnrRingMat);
    vnrRing.rotation.x = Math.PI / 2;
    vnrRing.position.set(VNR_X, 0.55, ROAD_Z);
    roadGroup.add(vnrRing);

    const innerRing = new THREE.Mesh(new THREE.TorusGeometry(5.5, 0.2, 8, 40), vnrRingMat);
    innerRing.rotation.x = Math.PI / 2;
    innerRing.position.set(VNR_X, 0.52, ROAD_Z);
    roadGroup.add(innerRing);

    const obeliskMat = new THREE.MeshStandardMaterial({
        color: 0x003850, emissive: 0x00b8d9, emissiveIntensity: 0.7,
        metalness: 0.9, roughness: 0.15
    });
    const obeliskShaft = new THREE.Mesh(new THREE.BoxGeometry(2.0, 10, 2.0), obeliskMat);
    obeliskShaft.position.set(VNR_X, 5.5, ROAD_Z);
    roadGroup.add(obeliskShaft);
    const obeliskTop = new THREE.Mesh(new THREE.ConeGeometry(1.6, 3.5, 4), obeliskMat);
    obeliskTop.rotation.y = Math.PI / 4;
    obeliskTop.position.set(VNR_X, 12, ROAD_Z);
    roadGroup.add(obeliskTop);
    const orbMat = new THREE.MeshStandardMaterial({
        color: 0x00f0ff, emissive: 0x00f0ff, emissiveIntensity: 3.5, transparent: true, opacity: 0.95
    });
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.8, 14, 14), orbMat);
    orb.position.set(VNR_X, 13.9, ROAD_Z);
    roadGroup.add(orb);

    createHUDLabel(
        'vnr-circle-label', 'VNR CIRCLE',
        new THREE.Vector3(VNR_X, 20, ROAD_Z),
        'SECURE', 0, '', false, '', true
    );

    createHUDLabel(
        'canteen-label', 'CANTEEN',
        new THREE.Vector3(CANTEEN_X, 12, ROAD_Z + 18),
        'SECURE', 0, '', false, '', true
    );

    const gatePillarMat = new THREE.MeshStandardMaterial({
        color: 0x0d2035, emissive: 0x001830,
        emissiveIntensity: 0.6, metalness: 0.8, roughness: 0.25
    });
    const gateGlowMat = new THREE.MeshStandardMaterial({
        color: 0x00f0ff, emissive: 0x00f0ff,
        emissiveIntensity: 2.5, transparent: true, opacity: 0.95
    });

    [-1, 1].forEach(side => {
        const pillarZ = ROAD_Z + side * (ROAD_W / 2 + 2.8);

        const pillar = new THREE.Mesh(new THREE.BoxGeometry(4, 18, 4), gatePillarMat);
        pillar.position.set(GATE_X, 9.0, pillarZ);
        roadGroup.add(pillar);

        const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.4, 16, 0.3), gateGlowMat);
        stripe.position.set(GATE_X + 2.1, 9.0, pillarZ - side * 2.0);
        roadGroup.add(stripe);

        const cap = new THREE.Mesh(new THREE.BoxGeometry(5.2, 1.5, 5.2), gateGlowMat);
        cap.position.set(GATE_X, 18.75, pillarZ);
        roadGroup.add(cap);
    });

    const archBeam = new THREE.Mesh(
        new THREE.BoxGeometry(4.5, 2.2, ROAD_W + 7.5),
        gateGlowMat
    );
    archBeam.position.set(GATE_X, 18.9, ROAD_Z);
    roadGroup.add(archBeam);

    const crestBody = new THREE.Mesh(new THREE.BoxGeometry(4.8, 4, 6.5), gatePillarMat);
    crestBody.position.set(GATE_X, 21.5, ROAD_Z);
    roadGroup.add(crestBody);
    const crestGlow = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.35, 5.5), gateGlowMat);
    crestGlow.position.set(GATE_X, 19.8, ROAD_Z);
    roadGroup.add(crestGlow);

    createHUDLabel(
        'main-gate-label', 'MAIN GATE',
        new THREE.Vector3(GATE_X, 28, ROAD_Z),
        'SECURE', 0, '', false, '', true
    );

    if (scene) scene.add(roadGroup);
}

function switchToMicroView(sector, shellMesh) {
    isMacroView = false;
    const returnBtn = document.getElementById('btn-return-macro');
    if (returnBtn) returnBtn.classList.remove('hidden');

    buildingShellsList.forEach(mesh => {
        if (mesh && mesh.material) {
            gsap.to(mesh.material, { opacity: 0.85, emissiveIntensity: 0.8, duration: 0.8 });
        }
    });

    switchSector(sector);
    logToConsole(`Expanded micro view for building block: ${sector}`, "sys-msg");
}

window.resetToMacroView = resetToMacroView;
function resetToMacroView() {
    isMacroView = true;
    selectedBlock = null;

    // Reset UI dropdown and stats display
    const labelEl = document.getElementById('block-dropdown-label');
    if (labelEl) labelEl.textContent = '-- Choose a Block --';

    const optionBtns = document.querySelectorAll('.block-option-btn');
    optionBtns.forEach(btn => btn.classList.remove('active'));

    const sectorDisplay = document.getElementById('active-sector-display');
    if (sectorDisplay) sectorDisplay.innerText = '--';

    const lvlSection = document.getElementById('level-selector-section');
    if (lvlSection) lvlSection.style.display = 'none';

    const returnBtn = document.getElementById('btn-return-macro');
    if (returnBtn) returnBtn.classList.add('hidden');

    buildingShellsList.forEach(mesh => {
        if (mesh && mesh.material) {
            gsap.killTweensOf(mesh.material);
            gsap.to(mesh.material, { opacity: 0.95, emissiveIntensity: 1.0, duration: 0.8 });
        }
    });

    if (typeof gsap !== 'undefined') {
        gsap.killTweensOf(camera.position);
        gsap.killTweensOf(controls.target);

        gsap.to(camera.position, { 
            x: 130, y: 140, z: -160, 
            duration: 1.2, 
            ease: "power2.out" 
        });
        gsap.to(controls.target, { 
            x: 20, y: 0, z: 10, 
            duration: 1.2, 
            ease: "power2.out", 
            onUpdate: () => controls.update() 
        });
    } else {
        camera.position.set(130, 140, -160);
        controls.target.set(20, 0, 10);
        controls.update();
    }

    updateFloorOpacities();
    logToConsole("Returned to Macro Campus View.", "sys-msg");
}

function setupFloorSelector() {
    const buttons = document.querySelectorAll('.floor-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const fVal = parseInt(btn.dataset.floor);
            changeActiveFloor(fVal - 1);
        });
    });
}

function changeActiveFloor(idx) {
    if (idx < 0 || idx >= floorGroups.length) return;
    activeFloorIndex = idx;

    const flData = campusData.floors[idx];
    const pgFloorNames = ['PG-G', 'PG-1', 'PG-2', 'PG-3', 'PG-4'];
    const dFloorNames = ['D-G', 'D-1', 'D-2', 'D-3', 'D-4'];
    const eFloorNames = ['E-G', 'E-1', 'E-2', 'E-3', 'E-4'];

    if (activeSector === 'PG-BLOCK') {
        document.getElementById('current-level-display').innerText = `${pgFloorNames[idx] || `PG-${idx}`} (FLR 0${idx + 1})`;
    } else if (activeSector === 'D-BLOCK') {
        document.getElementById('current-level-display').innerText = `${dFloorNames[idx] || `D-${idx}`} (FLR 0${idx + 1})`;
    } else if (activeSector === 'E-BLOCK') {
        document.getElementById('current-level-display').innerText = `${eFloorNames[idx] || `E-${idx}`} (FLR 0${idx + 1})`;
    } else {
        document.getElementById('current-level-display').innerText = flData.name.toUpperCase();
    }

    const activeSectorRooms = flData.rooms.filter(r => {
        const isPG = r.id.startsWith('pg') || (r.name && r.name.startsWith('PG'));
        const isD = r.id.startsWith('d-') || r.id.startsWith('d_') || (r.name && r.name.startsWith('D'));
        const isE = r.id.startsWith('e-') || r.id.startsWith('e_') || (r.name && r.name.startsWith('E'));
        if (activeSector === 'PG-BLOCK') return isPG;
        if (activeSector === 'D-BLOCK') return isD;
        if (activeSector === 'E-BLOCK') return isE;
        return (!isPG && !isD && !isE);
    });

    document.getElementById('total-rooms-display').innerText = `${activeSectorRooms.length} / ${activeSectorRooms.length}`;
    
    const alertCount = activeSectorRooms.filter(r => r.status === 'WARNING').length;
    const alertDisplay = document.getElementById('active-alerts-display');
    if (alertDisplay) {
        alertDisplay.innerText = alertCount;
        alertDisplay.className = alertCount > 0 ? "stat-val font-orbitron text-warning" : "stat-val font-orbitron text-success";
    }

    updateFloorOpacities();
}

function updateFloorOpacities() {
    const isIsolated = document.getElementById('isolation-toggle').checked;

    floorGroups.forEach((group, idx) => {
        const isActive = (idx === activeFloorIndex);

        // When isolated: hide all non-active floors completely
        if (isIsolated && !isActive) {
            group.visible = false;
            return;
        }

        group.visible = true;
        group.traverse(child => {
            if (child.isMesh || child.isLine) {
                if (!child.material) return;

                // Ensure transparency is enabled on first encounter
                if (!child.userData._opacityInitialized) {
                    child.userData._opacityInitialized = true;
                    child.material.transparent = true;
                    child.userData.baseOpacity = child.material.opacity !== undefined ? child.material.opacity : 1.0;
                    child.userData.baseEmissive = child.material.emissiveIntensity !== undefined ? child.material.emissiveIntensity : 0.0;
                }

                const baseOp = child.userData.baseOpacity;
                let targetOpacity;
                if (isActive) {
                    // Active floor: restore full original opacity
                    targetOpacity = baseOp;
                } else {
                    // Inactive floor (non-isolated): fade heavily so active floor is clear
                    targetOpacity = Math.min(baseOp * 0.18, 0.12);
                }

                gsap.to(child.material, { opacity: targetOpacity, duration: 0.45, overwrite: 'auto' });

                if (child.material.emissiveIntensity !== undefined) {
                    const targetEmissive = isActive ? child.userData.baseEmissive : child.userData.baseEmissive * 0.15;
                    gsap.to(child.material, { emissiveIntensity: targetEmissive, duration: 0.45, overwrite: 'auto' });
                }
            }
        });
    });
}

let _lastMouseMove = 0;
function onMouseMove(event) {
    const now = performance.now();
    if (now - _lastMouseMove < 100) return;
    _lastMouseMove = now;

    const container = document.getElementById('canvas-container');
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / container.clientWidth) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / container.clientHeight) * 2 + 1;

    if (isTransitioning) return;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(interactiveMeshes);

    if (intersects.length > 0) {
        const hitMesh = intersects[0].object;
        if (hitMesh.userData.floorIdx === activeFloorIndex) {
            if (hoveredNode !== hitMesh) {
                resetHoverState();
                hoveredNode = hitMesh;
                applyHoverState(hitMesh);
            }
        } else {
            if (hoveredNode) {
                resetHoverState();
                hoveredNode = null;
            }
        }
    } else {
        if (hoveredNode) {
            resetHoverState();
            hoveredNode = null;
        }
    }
}

function applyHoverState(mesh) {
    const data = mesh.userData;
    if (data.type === 'room') {
        const badge = document.getElementById(`badge-${data.meta.id}`);
        if (badge) badge.classList.add('highlighted');
        gsap.to(mesh.material, { opacity: 0.40, duration: 0.18 });
        if (data.coreNode) data.coreNode.rotation.y = Math.PI;
        if (data.doorMesh) {
            const targetPos = { duration: 0.4, ease: "power1.out" };
            targetPos[data.doorAxis || 'z'] = 1.2;
            gsap.to(data.doorMesh.position, targetPos);
        }
    }
    else if (data.type === 'connector') {
        const badge = document.getElementById(`badge-${data.id}`);
        if (badge) badge.classList.add('highlighted');
        gsap.to(mesh.material, { emissiveIntensity: 2.2, duration: 0.18 });
    }
    else if (data.type === 'staircase') {
        const badge = document.getElementById(`badge-${data.meta.id}`);
        if (badge) badge.classList.add('highlighted');
    }
}

function resetHoverState() {
    if (!hoveredNode) return;
    const data = hoveredNode.userData;
    if (data.type === 'room') {
        const badge = document.getElementById(`badge-${data.meta.id}`);
        if (badge) badge.classList.remove('highlighted');
        gsap.to(hoveredNode.material, { opacity: data.baseOpacity || 0.15, duration: 0.25 });
        if (data.doorMesh) {
            const targetPos = { duration: 0.4, ease: "power1.inOut" };
            targetPos[data.doorAxis || 'z'] = 0.0;
            gsap.to(data.doorMesh.position, targetPos);
        }
    }
    else if (data.type === 'connector') {
        const badge = document.getElementById(`badge-${data.id}`);
        if (badge) badge.classList.remove('highlighted');
        gsap.to(hoveredNode.material, { emissiveIntensity: data.baseEmissive || 1.5, duration: 0.25 });
    }
    else if (data.type === 'staircase') {
        const badge = document.getElementById(`badge-${data.meta.id}`);
        if (badge) badge.classList.remove('highlighted');
    }
    hoveredNode = null;
}

function showDiagnostics(meta) {}
function showConnectorDiagnostics(data) {}
function hideDiagnostics() {}

function onMouseClick(event) {
    if (event.target && event.target.closest('#ui-overlay')) return;
    if (isTransitioning) return;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(interactiveMeshes);
    if (intersects.length > 0) {
        const hitMesh = intersects[0].object;
        const data = hitMesh.userData;
        if (data.type === 'buildingShell') {
            switchToMicroView(data.sector, hitMesh);
            return;
        }
        if (data.floorIdx === activeFloorIndex) {
            if (data.type === 'room') focusNodeIn3D(data.meta.id, data.floorIdx);
            else if (data.type === 'connector') focusNodeIn3D(data.id, data.floorIdx);
        }
    }
}

function focusNodeIn3D(id, floorIdx) {
    if (isTransitioning) return;
    if (id.startsWith('portal-')) {
        triggerPortalTransition(id, floorIdx);
        return;
    }
    const targetRoom = campusData.floors[floorIdx].rooms.find(r => r.id === id);
    if (!targetRoom) return;
    const elev = campusData.floors[floorIdx].elevation;
    gsap.to(camera.position, {
        x: targetRoom.x + 8, y: elev + 8, z: targetRoom.z + 8, duration: 1.2, ease: "power2.out", onUpdate: () => controls.update()
    });
    gsap.to(controls.target, {
        x: targetRoom.x, y: elev + 1.2, z: targetRoom.z, duration: 1.2, ease: "power2.out", onUpdate: () => controls.update()
    });
}

function triggerPortalTransition(id, floorIdx) {
    isTransitioning = true;
    const connector = interactiveMeshes.find(m => m.userData.id === id);
    if (!connector) return;
    const connData = connector.userData;
    const overlay = document.getElementById('transition-overlay');
    const barEl = overlay.querySelector('.progress-bar-fill');
    overlay.classList.add('active');
    barEl.style.width = '0%';
    const flElevation = campusData.floors[floorIdx].elevation;
    gsap.to(camera.position, { x: connData.target.x, y: flElevation + 1.2, z: connData.target.z, duration: 1.5, ease: "power2.in" });
    gsap.to(controls.target, { x: connData.target.x, y: flElevation + 0.8, z: connData.target.z - 2, duration: 1.5, ease: "power2.in", onUpdate: () => controls.update() });
    gsap.to(barEl, {
        width: '100%', duration: 2.0, ease: "power1.inOut", onComplete: () => {
            setTimeout(() => {
                gsap.to(camera.position, { x: 35, y: flElevation + 32, z: -49, duration: 1.6, ease: "power2.out" });
                gsap.to(controls.target, { x: -3, y: flElevation + 0.5, z: 5, duration: 1.6, ease: "power2.out", onUpdate: () => controls.update() });
                overlay.classList.remove('active');
                isTransitioning = false;
                if (connData.name && connData.name.toLowerCase().includes('pg')) selectBlock('PG-BLOCK');
            }, 800);
        }
    });
}

let _hudTempV = null;
let _hudFrameCount = 0;

function updateHUDLabels() {
    if (!_hudTempV) _hudTempV = new THREE.Vector3();
    _hudFrameCount++;
    if (_hudFrameCount % 4 !== 0) return;

    const hudOpen = document.body.classList.contains('hud-open');
    const container = document.getElementById('canvas-container');
    if (!container) return;
    const vW = container.clientWidth;
    const vH = container.clientHeight;
    const widthHalf = vW / 2;
    const heightHalf = vH / 2;
    const isIsolated = document.getElementById('isolation-toggle')?.checked || false;
    const EDGE_PAD = 60;

    for (let i = 0; i < labelsList.length; i++) {
        const label = labelsList[i];
        if (!label || !label.domElement) continue;
        const isActiveFloor = (label.floorIdx === activeFloorIndex);
        let shouldBeVisible = false;

        if (label.isLandmarkLabel || label.isMacroLabel) shouldBeVisible = true;
        else if (hudOpen) {
            if (selectedBlock && label.roomSector === selectedBlock) {
                shouldBeVisible = isIsolated ? isActiveFloor : true;
            }
        }

        if (!shouldBeVisible) {
            label.domElement.classList.remove('visible');
            continue;
        }

        // Project world position to screen
        _hudTempV.copy(label.worldPosition);
        _hudTempV.project(camera);

        // Convert NDC to screen-space pixel coords
        const x = Math.round((_hudTempV.x * widthHalf) + widthHalf);
        const y = Math.round(-(_hudTempV.y * heightHalf) + heightHalf);

        // Secondary pixel-space clipping with edge padding
        if (x < EDGE_PAD || x > vW - EDGE_PAD || y < EDGE_PAD || y > vH - EDGE_PAD) {
            if (label.domElement.classList.contains('visible')) {
                label.domElement.classList.remove('visible');
            }
            continue;
        }

        if (label.lastX !== x || label.lastY !== y) {
            label.lastX = x;
            label.lastY = y;
            label.domElement.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -100%)`;
        }

        if (!label.domElement.classList.contains('visible')) {
            label.domElement.classList.add('visible');
        }
    }
}

// Window resize
function onWindowResize() {
    const container = document.getElementById('canvas-container');
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

// Animation Render Loop (Optimized for instant camera response & high FPS)
function animate() {
    requestAnimationFrame(animate);
    controls.update();

    // Rotate active connectors (cached O(1) loop)
    for (let i = 0; i < animatedConnectors.length; i++) {
        const mesh = animatedConnectors[i];
        if (mesh.parent && mesh.parent.parent && mesh.parent.parent.visible) {
            mesh.rotation.y += 0.007;
            mesh.rotation.x += 0.003;
            if (mesh.userData.ringMesh) {
                mesh.userData.ringMesh.rotation.z += 0.015;
            }
        }
    }

    // Core node pulsing only active in non-realistic modes
    // (currentRenderMode is always 'realistic' so this block is permanently skipped)

    updateHUDLabels();
    renderer.render(scene, camera);
}

// Log events to the Live Event Console
// Console panel removed — logToConsole is now a no-op for performance
function logToConsole(message, type = '') {
    // console.log(`[${type}] ${message}`); // uncomment to debug in DevTools
}

// Load
window.onload = () => {
    init();
};
