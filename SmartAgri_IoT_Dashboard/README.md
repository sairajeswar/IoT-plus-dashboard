# 🌱 AGRI-SYNAPSE IoT: Smart Agriculture & Remote Monitoring System

An end-to-end IoT Smart Agriculture monitoring and automated closed-loop irrigation system.

> **Remote Demo Solution:**
> Agriculture and hardware monitoring systems normally require physical soil, plants, pumps, and field sensors, making them difficult to demonstrate remotely. **AGRI-SYNAPSE** includes a built-in **Virtual Hardware Simulator & Physics Engine**, allowing complete live demonstrations of soil drying, sensor drift, automated pump activation, safety interlocks, and emergency shutdowns without needing physical hardware attached.

---

## 🎨 Strict Color Palette Design

The dashboard is engineered with a strict high-contrast cyber-agritech palette:

| Color | Hex / CSS | Agronomic Application |
|---|---|---|
| **Black** | `#060608` / `#0e0e14` | Void dark background, obsidian cards, and low-light field UI |
| **Red** | `#ff0038` / `#e60026` | Critical alerts (severe drought, frost, heatwaves), emergency shutdown, active pump warnings |
| **Pink** | `#ff2e93` / `#ff75a0` | Soil moisture gauges, automated closed-loop status, NDVI canopy indices, wireless indicators |
| **White** | `#ffffff` / `#f8fafc` | High-visibility metric values, primary typography, nominal status indicators |

---

## 🚀 Quick Start Guide

### Option 1: Standalone Browser Launch (Zero-Setup)
You can open `public/index.html` directly in any web browser (`Chrome`, `Edge`, `Firefox`, `Brave`). The frontend includes a built-in browser physics loop so it works offline and without server installation.

### Option 2: Live Server with SSE Stream & REST API
```bash
# 1. Start the server
npm start
# or: node server.js

# 2. Open dashboard in your browser
http://localhost:3000
```

Or double-click `run_dashboard.bat` on Windows!

---

## 🧪 Automated Test Suite (100% Passing)

To execute all unit and integration test cases:

```bash
npm test
```

### Test Coverage Summary:
- **Simulator Tests (`tests/simulator.test.js`)**:
  - Initial state and default invariants
  - Natural evapotranspiration and soil moisture loss physics
  - Irrigation pump water delivery and moisture replenishment
  - Scenario injection (Drought, Heatwave, Waterlogged, Optimal)
  - Closed-loop automated start and cutoff thresholds
- **Alert Engine Tests (`tests/alertEngine.test.js`)**:
  - Critical moisture threshold (< 25%) triggering **RED** alarms
  - Warning moisture threshold (< 35%) triggering **PINK** advisories
  - Thermal stress threshold (> 38°C) triggering **RED** alerts
  - Soil pH drift triggering **PINK** alerts
  - Nominal condition generating **WHITE** nominal info status
- **Actuator Controller Tests (`tests/actuator.test.js`)**:
  - Manual pump and multi-zone valve toggles
  - Emergency shutdown forceful isolation & safety lock
  - Reservoir level dry-run safety interlock (< 10%)
- **API Model Tests (`tests/api.test.js`)**:
  - Telemetry payload serialization and threshold updates

---

## 🎮 How to Conduct a Remote Demo

1. Open the dashboard at `http://localhost:3000` (or `public/index.html`).
2. Click the **⚡ START REMOTE DEMO** button in the header.
3. The interactive demo engine will automatically step through 5 phases:
   - **Phase 1: Baseline Equilibrium** — Shows healthy crops with optimal moisture (48%).
   - **Phase 2: Drought Injected** — Simulates rapid moisture depletion (< 22%), immediately triggering a **RED** critical alert with audio beeps.
   - **Phase 3: Autonomous Autopilot Actuation** — System autonomously triggers the Main Irrigation Pump and Zone A valve.
   - **Phase 4: Moisture Rehydration** — Soil absorbs water delivered at 0.8 L/sec, cooling canopy temperatures.
   - **Phase 5: Auto Cut-off & All-Clear** — Reaching 60% automatically disengages the pump, returning all alerts to **WHITE** nominal status.

You can also manually click any scenario preset (**Severe Drought**, **Extreme Heatwave**, **Waterlogged Soil**, **Nutrient Deficit**) or toggle pumps and valves manually.

---

## 🔌 Hardware Schematics & ESP32 Firmware

A production-ready Arduino/ESP32 C++ firmware sketch is provided in [`firmware/esp32_smart_agri_node.ino`](firmware/esp32_smart_agri_node.ino).

### Pin Connections:
- **Capacitive Soil Moisture Sensor v1.2**: `GPIO 34` (ADC1_CH6)
- **DHT22 / SHT31 Temp & Humidity**: `GPIO 4`
- **Main Irrigation Relay / Solenoid**: `GPIO 18` (Active LOW)
- **Canopy Misting Solenoid**: `GPIO 19` (Active LOW)
- **Zone A Valve Relay**: `GPIO 21` (Active LOW)
- **Status Indicator LED**: `GPIO 2`

---

## 📦 Zip File

The complete project has been bundled into a zip archive and saved directly to your Desktop at:
`C:\Users\hp\Desktop\SmartAgri_IoT_Dashboard.zip`
