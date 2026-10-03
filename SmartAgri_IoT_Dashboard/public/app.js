/**
 * AGRI-SYNAPSE IoT Dashboard Frontend Application
 * Hybrid Dual-Engine Architecture:
 * - Automatically connects to Server-Sent Events (SSE) when server is running.
 * - Gracefully falls back to In-Browser Physics Engine if opened directly from disk.
 * - Interactive Remote Demo Script for flawless presentations.
 */

// Global State
const appState = {
  telemetry: {
    soilMoisture: 48.5,
    soilTemperature: 22.4,
    ambientTemperature: 26.8,
    ambientHumidity: 62.0,
    solarRadiation: 650,
    nitrogen: 145,
    phosphorus: 42,
    potassium: 195,
    batteryPercent: 94.2,
    rssi: -68,
    greenhouseTemp: 24.5,
    greenhouseHumidity: 70.2,
    reservoirLevel: 82.0,
    soilPh: 6.4,
    electricalConductivity: 1.8,
    co2Level: 620,
    ndviIndex: 0.74,
    canopyTemperature: 23.8,
    pumpState: false,
    valveA: false,
    valveB: false,
    valveC: false,
    misterState: false,
    totalWaterDeliveredLiters: 1240.5,
    lastUpdated: new Date().toISOString()
  },
  alerts: [],
  history: [],
  activeScenario: 'OPTIMAL',
  autoIrrigationEnabled: true,
  emergencyLock: false,
  soundMuted: false,
  isRemoteDemoRunning: false,
  remoteDemoStep: 0,
  serverConnected: false
};

// Web Audio API Sound Synthesizer
let audioCtx = null;
function playSound(type) {
  if (appState.soundMuted) return;
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === 'alert-critical') {
      // Urgent double high beep (Red)
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      osc.frequency.setValueAtTime(660, audioCtx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.28);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } else if (type === 'action') {
      // Soft high chime (Pink)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(540, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(720, audioCtx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.18);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.2);
    }
  } catch (e) {
    // Audio context not allowed until user interaction
  }
}

// -------------------------------------------------------------
// UI Render Functions
// -------------------------------------------------------------
function renderDashboard() {
  const t = appState.telemetry;

  // 1. KPI Values
  document.getElementById('kpi-moisture').innerText = t.soilMoisture.toFixed(1);
  document.getElementById('fill-moisture').style.width = `${Math.min(100, Math.max(0, t.soilMoisture))}%`;

  document.getElementById('kpi-temp').innerText = t.ambientTemperature.toFixed(1);
  document.getElementById('fill-temp').style.width = `${Math.min(100, Math.max(0, (t.ambientTemperature / 50) * 100))}%`;

  document.getElementById('kpi-humidity').innerText = `${t.ambientHumidity.toFixed(0)}%`;
  document.getElementById('kpi-reservoir').innerText = `${t.reservoirLevel.toFixed(0)}%`;
  document.getElementById('fill-reservoir').style.width = `${t.reservoirLevel}%`;

  document.getElementById('kpi-npk').innerText = `${t.nitrogen}/${t.phosphorus}/${t.potassium}`;
  document.getElementById('kpi-ph').innerText = t.soilPh.toFixed(1);
  document.getElementById('kpi-ndvi').innerText = t.ndviIndex.toFixed(2);
  document.getElementById('kpi-water-liters').innerText = t.totalWaterDeliveredLiters.toFixed(1);

  // 2. Pump & Actuator Badges
  const pumpBadge = document.getElementById('badge-pump');
  const pumpSwitch = document.getElementById('switch-pump');
  if (t.pumpState) {
    pumpBadge.innerText = 'PUMP ACTIVE';
    pumpBadge.className = 'kpi-badge kpi-badge-red pulse-red-ring';
    pumpSwitch.checked = true;
  } else {
    pumpBadge.innerText = 'IDLE';
    pumpBadge.className = 'kpi-badge kpi-badge-white';
    pumpSwitch.checked = false;
  }

  // Solenoid Valves
  document.getElementById('switch-valve-a').checked = t.valveA;
  document.getElementById('switch-valve-b').checked = t.valveB;
  document.getElementById('switch-valve-c').checked = t.valveC;
  document.getElementById('switch-mister').checked = t.misterState;
  document.getElementById('switch-autopilot').checked = appState.autoIrrigationEnabled;

  // 3. Field Sector Sprinkler Animations
  const sectorA = document.getElementById('sector-a');
  const sectorB = document.getElementById('sector-b');
  const sectorC = document.getElementById('sector-c');

  sectorA.className = t.valveA && t.pumpState ? 'field-sector irrigating' : 'field-sector';
  sectorB.className = t.valveB && t.pumpState ? 'field-sector irrigating' : 'field-sector';
  sectorC.className = t.valveC && t.pumpState ? 'field-sector irrigating' : 'field-sector';

  document.getElementById('sprinkler-a').className = t.valveA && t.pumpState ? 'sprinkler-anim sprinkler-active' : 'sprinkler-anim';
  document.getElementById('sprinkler-b').className = t.valveB && t.pumpState ? 'sprinkler-anim sprinkler-active' : 'sprinkler-anim';
  document.getElementById('sprinkler-c').className = t.valveC && t.pumpState ? 'sprinkler-anim sprinkler-active' : 'sprinkler-anim';

  // Sector Data Display
  document.getElementById('sector-a-moist').innerText = `${t.soilMoisture.toFixed(1)}%`;
  document.getElementById('sector-b-temp').innerText = `${t.greenhouseTemp.toFixed(1)}°C`;
  document.getElementById('sector-c-ndvi').innerText = t.ndviIndex.toFixed(2);

  // 4. Emergency Lock UI state
  const emergBtn = document.getElementById('btn-emergency');
  if (appState.emergencyLock) {
    emergBtn.innerText = 'RELEASE EMERGENCY LOCK';
    emergBtn.className = 'emergency-btn pulse-red-ring';
  } else {
    emergBtn.innerText = 'EMERGENCY SHUTDOWN';
    emergBtn.className = 'emergency-btn';
  }

  // 5. Render Alerts
  renderAlerts();

  // 6. Redraw Canvas Charts
  drawCharts();
}

function renderAlerts() {
  const container = document.getElementById('alerts-container');
  if (!container) return;

  if (!appState.alerts || appState.alerts.length === 0) {
    container.innerHTML = `
      <div class="alert-item severity-INFO">
        <div class="alert-icon">🌱</div>
        <div class="alert-content">
          <div class="alert-title-row">
            <span class="alert-heading">All Systems Nominal</span>
            <span class="alert-time">Live</span>
          </div>
          <p class="alert-text">No active warnings or anomalies detected in monitored sectors.</p>
        </div>
      </div>
    `;
    return;
  }

  let html = '';
  for (const alt of appState.alerts) {
    let icon = 'ℹ️';
    if (alt.severity === 'CRITICAL') icon = '🚨';
    if (alt.severity === 'WARNING') icon = '⚠️';

    html += `
      <div class="alert-item severity-${alt.severity}">
        <div class="alert-icon">${icon}</div>
        <div class="alert-content">
          <div class="alert-title-row">
            <span class="alert-heading">${alt.title}</span>
            <span class="alert-time">${alt.node}</span>
          </div>
          <p class="alert-text">${alt.message}</p>
        </div>
      </div>
    `;
  }
  container.innerHTML = html;
}

// -------------------------------------------------------------
// Canvas Telemetry Charts (Red, Pink, Black, White)
// -------------------------------------------------------------
function drawCharts() {
  drawMoistureChart();
  drawMicroclimateChart();
}

function drawMoistureChart() {
  const canvas = document.getElementById('chart-moisture');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width = canvas.parentElement.clientWidth;
  const h = canvas.height = canvas.parentElement.clientHeight;

  // Background
  ctx.fillStyle = '#0e0e14';
  ctx.fillRect(0, 0, w, h);

  // Grid lines
  ctx.strokeStyle = '#1e1e28';
  ctx.lineWidth = 1;
  for (let y = 0; y <= h; y += h / 4) {
    ctx.beginPath();
    ctx.moveTo(30, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Draw critical threshold line (Moisture 30% in RED)
  const threshY = h - (30 / 100) * (h - 20) - 10;
  ctx.strokeStyle = '#ff0038';
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(30, threshY);
  ctx.lineTo(w, threshY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#ff0038';
  ctx.font = '10px monospace';
  ctx.fillText('CRITICAL 30%', 35, threshY - 4);

  // If insufficient history, create demo buffer
  const history = appState.history.length > 2 ? appState.history : generateFallbackHistory();
  if (history.length < 2) return;

  const stepX = (w - 40) / (history.length - 1);

  // Draw Area Fill (Cyber Pink gradient)
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, 'rgba(255, 46, 147, 0.45)');
  grad.addColorStop(1, 'rgba(255, 46, 147, 0.0)');

  ctx.beginPath();
  history.forEach((pt, i) => {
    const x = 35 + i * stepX;
    const y = h - (pt.soilMoisture / 100) * (h - 20) - 10;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.lineTo(35 + (history.length - 1) * stepX, h);
  ctx.lineTo(35, h);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Draw Line
  ctx.beginPath();
  ctx.strokeStyle = '#ff2e93';
  ctx.lineWidth = 2.5;
  history.forEach((pt, i) => {
    const x = 35 + i * stepX;
    const y = h - (pt.soilMoisture / 100) * (h - 20) - 10;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Draw point on current value
  const lastPt = history[history.length - 1];
  const lastX = 35 + (history.length - 1) * stepX;
  const lastY = h - (lastPt.soilMoisture / 100) * (h - 20) - 10;
  ctx.beginPath();
  ctx.arc(lastX, lastY, 5, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#ff0038';
  ctx.stroke();
}

function drawMicroclimateChart() {
  const canvas = document.getElementById('chart-microclimate');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width = canvas.parentElement.clientWidth;
  const h = canvas.height = canvas.parentElement.clientHeight;

  ctx.fillStyle = '#0e0e14';
  ctx.fillRect(0, 0, w, h);

  const history = appState.history.length > 2 ? appState.history : generateFallbackHistory();
  if (history.length < 2) return;

  const stepX = (w - 40) / (history.length - 1);

  // Line 1: Ambient Temp in Hot Red
  ctx.beginPath();
  ctx.strokeStyle = '#ff0038';
  ctx.lineWidth = 2;
  history.forEach((pt, i) => {
    const x = 35 + i * stepX;
    const y = h - ((pt.ambientTemperature || 25) / 50) * (h - 30) - 15;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Line 2: Ambient Humidity in White
  ctx.beginPath();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([3, 3]);
  history.forEach((pt, i) => {
    const x = 35 + i * stepX;
    const y = h - ((pt.ambientHumidity || 60) / 100) * (h - 30) - 15;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.setLineDash([]);
}

function generateFallbackHistory() {
  const pts = [];
  const curr = appState.telemetry.soilMoisture;
  for (let i = 15; i >= 0; i--) {
    pts.push({
      soilMoisture: Math.max(10, curr + (Math.sin(i) * 3)),
      ambientTemperature: 26 + Math.cos(i) * 1.5,
      ambientHumidity: 62 + Math.sin(i) * 4
    });
  }
  return pts;
}

// -------------------------------------------------------------
// Interactive Remote Demo Script Engine
// Solves: "Smart agriculture systems are harder to demo remotely."
// -------------------------------------------------------------
const DEMO_STEPS = [
  {
    step: 1,
    title: 'Phase 1: Baseline Equilibrium',
    desc: 'Plot is in optimal state. Soil moisture nominal (48%), ambient temp 26°C. LoRa node telemetry streaming live.',
    action: () => triggerScenario('OPTIMAL')
  },
  {
    step: 2,
    title: 'Phase 2: Drought & Heatwave Injected',
    desc: 'Simulating intense drought. Moisture drops to 22%, temp surges to 38°C. Critical RED alert triggered!',
    action: () => {
      triggerScenario('DROUGHT');
      playSound('alert-critical');
    }
  },
  {
    step: 3,
    title: 'Phase 3: Closed-Loop Autonomous Irrigation Actuation',
    desc: 'Automated controller detects moisture < 35%. Main Pump & Solenoid Valve A actuate automatically to save crop.',
    action: () => {
      setPump(true);
      playSound('action');
    }
  },
  {
    step: 4,
    title: 'Phase 4: Root Zone Moisture Rehydrated',
    desc: 'Water flow delivers 0.8 L/sec. Soil moisture climbs steadily past safe thresholds, canopy heat stress cools down.',
    action: () => {
      appState.telemetry.soilMoisture = 52.0;
      appState.telemetry.ambientTemperature = 25.8;
      renderDashboard();
    }
  },
  {
    step: 5,
    title: 'Phase 5: Auto Cut-off & All-Clear Status',
    desc: 'Cut-off threshold (60%) achieved. Controller shuts off pump to prevent water waste. System back to nominal white state!',
    action: () => {
      setPump(false);
      triggerScenario('OPTIMAL');
      playSound('action');
    }
  }
];

let demoTimer = null;

function runInteractiveDemo() {
  if (appState.isRemoteDemoRunning) {
    // Stop demo
    clearInterval(demoTimer);
    appState.isRemoteDemoRunning = false;
    document.getElementById('btn-run-demo').innerText = 'START REMOTE DEMO';
    document.getElementById('btn-run-demo').className = 'btn btn-pink';
    return;
  }

  appState.isRemoteDemoRunning = true;
  appState.remoteDemoStep = 0;
  document.getElementById('btn-run-demo').innerText = 'PAUSE DEMO';
  document.getElementById('btn-run-demo').className = 'btn btn-red';

  executeDemoStep(0);

  demoTimer = setInterval(() => {
    appState.remoteDemoStep = (appState.remoteDemoStep + 1) % DEMO_STEPS.length;
    executeDemoStep(appState.remoteDemoStep);
  }, 6000);
}

function executeDemoStep(idx) {
  const step = DEMO_STEPS[idx];
  document.getElementById('demo-step-title').innerText = step.title;
  document.getElementById('demo-step-desc').innerText = step.desc;
  step.action();
}

// -------------------------------------------------------------
// Scenario Triggering (Client & Server)
// -------------------------------------------------------------
async function triggerScenario(name) {
  appState.activeScenario = name;
  playSound('action');

  // Update scenario button styling
  document.querySelectorAll('.btn-scenario').forEach(btn => {
    btn.classList.remove('active', 'active-danger');
    if (btn.dataset.scenario === name) {
      btn.classList.add(name === 'DROUGHT' || name === 'HEATWAVE' ? 'active-danger' : 'active');
    }
  });

  if (appState.serverConnected) {
    try {
      await fetch('/api/scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario: name })
      });
      return;
    } catch {
      // Fallback to local simulation
    }
  }

  // Local In-Browser Simulation Fallback
  if (name === 'DROUGHT') {
    appState.telemetry.soilMoisture = 21.5;
    appState.telemetry.ambientTemperature = 38.2;
    appState.telemetry.ambientHumidity = 22.0;
    appState.alerts = [{
      severity: 'CRITICAL',
      title: 'Severe Root Desiccation Risk',
      message: 'Soil moisture is at 21.5% (< 25% threshold). Crop wilting imminent.',
      node: 'Field Node #01'
    }];
  } else if (name === 'HEATWAVE') {
    appState.telemetry.ambientTemperature = 41.5;
    appState.telemetry.greenhouseTemp = 37.0;
    appState.alerts = [{
      severity: 'CRITICAL',
      title: 'Extreme Canopy Heat Stress',
      message: 'Temperature exceeds 40°C threshold. Misting cycle advised.',
      node: 'Greenhouse Node #02'
    }];
  } else if (name === 'WATERLOGGED') {
    appState.telemetry.soilMoisture = 95.0;
    appState.alerts = [{
      severity: 'WARNING',
      title: 'Soil Waterlogging Detected',
      message: 'Root zone saturation at 95%. Drainage valve activated.',
      node: 'Field Node #01'
    }];
  } else if (name === 'NUTRIENT_DEFICIT') {
    appState.telemetry.soilPh = 5.2;
    appState.telemetry.nitrogen = 55;
    appState.alerts = [{
      severity: 'WARNING',
      title: 'Low Nitrogen & Acidic pH Drift',
      message: 'Nitrogen level depleted. Soil pH 5.2 below minimum 5.8.',
      node: 'Field Node #01'
    }];
  } else {
    // OPTIMAL
    appState.telemetry.soilMoisture = 48.5;
    appState.telemetry.ambientTemperature = 26.5;
    appState.telemetry.ambientHumidity = 62.0;
    appState.telemetry.soilPh = 6.4;
    appState.alerts = [];
  }

  appState.history.push({ ...appState.telemetry });
  if (appState.history.length > 30) appState.history.shift();
  renderDashboard();
}

// -------------------------------------------------------------
// Actuator Operations
// -------------------------------------------------------------
async function setPump(state) {
  if (appState.emergencyLock) {
    alert('Action blocked: Emergency Lock is active. Clear emergency stop first.');
    renderDashboard();
    return;
  }
  playSound('action');
  appState.telemetry.pumpState = Boolean(state);
  appState.telemetry.valveA = Boolean(state);

  if (appState.serverConnected) {
    try {
      await fetch('/api/actuators/pump', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: Boolean(state) })
      });
    } catch {}
  }
  renderDashboard();
}

async function setMister(state) {
  if (appState.emergencyLock) return;
  playSound('action');
  appState.telemetry.misterState = Boolean(state);

  if (appState.serverConnected) {
    try {
      await fetch('/api/actuators/mister', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: Boolean(state) })
      });
    } catch {}
  }
  renderDashboard();
}

async function setValve(zone, state) {
  if (appState.emergencyLock) return;
  playSound('action');
  if (zone === 'A') appState.telemetry.valveA = Boolean(state);
  if (zone === 'B') appState.telemetry.valveB = Boolean(state);
  if (zone === 'C') appState.telemetry.valveC = Boolean(state);

  if (appState.serverConnected) {
    try {
      await fetch('/api/actuators/valve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zone, state: Boolean(state) })
      });
    } catch {}
  }
  renderDashboard();
}

async function toggleEmergencyStop() {
  playSound('alert-critical');
  appState.emergencyLock = !appState.emergencyLock;
  if (appState.emergencyLock) {
    appState.telemetry.pumpState = false;
    appState.telemetry.misterState = false;
    appState.telemetry.valveA = false;
    appState.telemetry.valveB = false;
    appState.telemetry.valveC = false;
  }

  if (appState.serverConnected) {
    const endpoint = appState.emergencyLock ? '/api/actuators/emergency-stop' : '/api/actuators/clear-emergency';
    try {
      await fetch(endpoint, { method: 'POST' });
    } catch {}
  }
  renderDashboard();
}

async function toggleAutopilot(enabled) {
  playSound('action');
  appState.autoIrrigationEnabled = Boolean(enabled);
  if (appState.serverConnected) {
    try {
      await fetch('/api/auto-irrigation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: appState.autoIrrigationEnabled })
      });
    } catch {}
  }
  renderDashboard();
}

// -------------------------------------------------------------
// Live SSE Connection & Local Heartbeat
// -------------------------------------------------------------
function setupRealtimeStream() {
  if (window.location.protocol === 'file:') {
    initLocalSimulationLoop();
    return;
  }

  try {
    const evtSource = new EventSource('/api/stream');
    
    evtSource.onopen = () => {
      appState.serverConnected = true;
      document.getElementById('conn-status').innerText = 'SERVER SSE LIVE';
      document.getElementById('conn-dot').className = 'live-dot';
    };

    evtSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.telemetry) {
        appState.telemetry = data.telemetry;
        appState.alerts = data.alerts || [];
        appState.emergencyLock = Boolean(data.emergencyLock);
        appState.autoIrrigationEnabled = Boolean(data.autoIrrigationEnabled);
        
        appState.history.push({ ...data.telemetry });
        if (appState.history.length > 40) appState.history.shift();

        // Check if new critical alert
        const hasCrit = appState.alerts.some(a => a.severity === 'CRITICAL');
        if (hasCrit) playSound('alert-critical');

        renderDashboard();
      }
    };

    evtSource.onerror = () => {
      evtSource.close();
      appState.serverConnected = false;
      document.getElementById('conn-status').innerText = 'OFFLINE SIMULATOR';
      document.getElementById('conn-dot').className = 'live-dot active-red';
      initLocalSimulationLoop();
    };
  } catch {
    initLocalSimulationLoop();
  }
}

function initLocalSimulationLoop() {
  document.getElementById('conn-status').innerText = 'BROWSER ENGINE';
  setInterval(() => {
    // In-browser physics tick
    const t = appState.telemetry;
    if (t.pumpState) {
      t.soilMoisture = Math.min(95, t.soilMoisture + 1.2);
      t.totalWaterDeliveredLiters += 0.8;
      if (appState.autoIrrigationEnabled && t.soilMoisture >= 60) {
        setPump(false);
      }
    } else {
      t.soilMoisture = Math.max(12, t.soilMoisture - 0.08);
      if (appState.autoIrrigationEnabled && t.soilMoisture <= 35) {
        setPump(true);
      }
    }

    appState.history.push({ ...t });
    if (appState.history.length > 30) appState.history.shift();
    renderDashboard();
  }, 2500);
}

// -------------------------------------------------------------
// Export CSV Functionality
// -------------------------------------------------------------
function downloadCSV() {
  playSound('action');
  if (appState.serverConnected) {
    window.location.href = '/api/export.csv';
    return;
  }

  // Client-side CSV generation
  let csv = 'Timestamp,SoilMoisture_Pct,AmbientTemp_C,Humidity_Pct,Reservoir_Pct,PumpState\n';
  appState.history.forEach(r => {
    csv += `"${new Date().toISOString()}",${r.soilMoisture.toFixed(1)},${r.ambientTemperature.toFixed(1)},${r.ambientHumidity.toFixed(0)},${r.reservoirLevel.toFixed(0)},${r.pumpState}\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'smart_agri_telemetry.csv';
  a.click();
}

// -------------------------------------------------------------
// Initialization & Event Listeners
// -------------------------------------------------------------
window.addEventListener('DOMContentLoaded', () => {
  renderDashboard();
  setupRealtimeStream();

  // Scenario Buttons
  document.querySelectorAll('.btn-scenario').forEach(btn => {
    btn.addEventListener('click', () => {
      triggerScenario(btn.dataset.scenario);
    });
  });

  // Actuator Switches
  document.getElementById('switch-pump').addEventListener('change', (e) => {
    setPump(e.target.checked);
  });
  document.getElementById('switch-mister').addEventListener('change', (e) => {
    setMister(e.target.checked);
  });
  document.getElementById('switch-valve-a').addEventListener('change', (e) => {
    setValve('A', e.target.checked);
  });
  document.getElementById('switch-valve-b').addEventListener('change', (e) => {
    setValve('B', e.target.checked);
  });
  document.getElementById('switch-valve-c').addEventListener('change', (e) => {
    setValve('C', e.target.checked);
  });
  document.getElementById('switch-autopilot').addEventListener('change', (e) => {
    toggleAutopilot(e.target.checked);
  });

  // Emergency Stop Button
  document.getElementById('btn-emergency').addEventListener('click', toggleEmergencyStop);

  // Remote Demo Walkthrough Button
  document.getElementById('btn-run-demo').addEventListener('click', runInteractiveDemo);

  // Sound Toggle
  document.getElementById('btn-sound-toggle').addEventListener('click', () => {
    appState.soundMuted = !appState.soundMuted;
    document.getElementById('btn-sound-toggle').innerText = appState.soundMuted ? '🔇 MUTED' : '🔊 AUDIO ON';
    playSound('action');
  });

  // Export CSV
  document.getElementById('btn-export-csv').addEventListener('click', downloadCSV);

  // Resize listener for sharp canvas charts
  window.addEventListener('resize', drawCharts);
});
