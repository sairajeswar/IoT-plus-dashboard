/**
 * AGRI-SYNAPSE IoT Server
 * Lightweight zero-dependency HTTP & Real-time SSE server
 * Powers the Smart Agriculture Remote Demo & Virtual Hardware Gateway.
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const SmartAgriSimulator = require('./src/simulator.js');
const AlertEngine = require('./src/alertEngine.js');
const ActuatorController = require('./src/actuatorController.js');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

// Initialize Core IoT Components
const simulator = new SmartAgriSimulator();
const alertEngine = new AlertEngine();
const actuatorController = new ActuatorController(simulator);

// Telemetry history buffer for chart persistence (last 60 data points)
const telemetryHistory = [];

// Physics tick interval (every 2.5 seconds)
setInterval(() => {
  const state = simulator.tick(2.5);
  const alerts = alertEngine.evaluate(state);
  
  const record = {
    ...state,
    alerts,
    timestamp: new Date().toLocaleTimeString()
  };

  telemetryHistory.push(record);
  if (telemetryHistory.length > 60) {
    telemetryHistory.shift();
  }

  // Broadcast to all active SSE clients
  broadcastSSE({
    telemetry: state,
    alerts,
    emergencyLock: actuatorController.emergencyLock,
    autoIrrigationEnabled: simulator.autoIrrigationEnabled
  });
}, 2500);

// SSE connection pool
const sseClients = new Set();

function broadcastSSE(data) {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(message);
    } catch {
      sseClients.delete(client);
    }
  }
}

// MIME types for static assets
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1e6) {
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  // CORS headers for remote access & local testing
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // 1. SSE Real-Time Stream Endpoint
  if (pathname === '/api/stream' && req.method === 'GET') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    // Send immediate snapshot
    const initialData = {
      telemetry: simulator.getState(),
      alerts: alertEngine.evaluate(simulator.getState()),
      emergencyLock: actuatorController.emergencyLock,
      autoIrrigationEnabled: simulator.autoIrrigationEnabled,
      history: telemetryHistory.slice(-20)
    };
    res.write(`data: ${JSON.stringify(initialData)}\n\n`);

    sseClients.add(res);
    req.on('close', () => {
      sseClients.delete(res);
    });
    return;
  }

  // 2. REST API: Telemetry snapshot
  if (pathname === '/api/telemetry' && req.method === 'GET') {
    const state = simulator.getState();
    const alerts = alertEngine.evaluate(state);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      telemetry: state,
      alerts,
      history: telemetryHistory.slice(-25),
      emergencyLock: actuatorController.emergencyLock,
      autoIrrigationEnabled: simulator.autoIrrigationEnabled
    }));
    return;
  }

  // 3. REST API: Scenario Selection
  if (pathname === '/api/scenario' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const scenario = body.scenario || 'OPTIMAL';
      const updatedState = simulator.setScenario(scenario);
      const alerts = alertEngine.evaluate(updatedState);
      
      broadcastSSE({
        telemetry: updatedState,
        alerts,
        emergencyLock: actuatorController.emergencyLock,
        autoIrrigationEnabled: simulator.autoIrrigationEnabled
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, scenario, state: updatedState }));
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  // 4. REST API: Actuator Controls
  if (pathname === '/api/actuators/pump' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const updatedState = actuatorController.setPump(body.state);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, state: updatedState }));
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  if (pathname === '/api/actuators/mister' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const updatedState = actuatorController.setMister(body.state);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, state: updatedState }));
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  if (pathname === '/api/actuators/valve' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const updatedState = actuatorController.setValve(body.zone, body.state);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, state: updatedState }));
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  if (pathname === '/api/actuators/emergency-stop' && req.method === 'POST') {
    const result = actuatorController.triggerEmergencyStop();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, ...result }));
    return;
  }

  if (pathname === '/api/actuators/clear-emergency' && req.method === 'POST') {
    const result = actuatorController.clearEmergencyStop();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, ...result }));
    return;
  }

  if (pathname === '/api/auto-irrigation' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const result = actuatorController.toggleAutoIrrigation(body.enabled);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, ...result }));
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  // 5. REST API: Telemetry CSV Export
  if (pathname === '/api/export.csv' && req.method === 'GET') {
    const headers = 'Timestamp,SoilMoisture_Pct,SoilTemp_C,AmbientTemp_C,Humidity_Pct,SolarRad_Wm2,Nitrogen_mgkg,Phosphorus_mgkg,Potassium_mgkg,Reservoir_Pct,PumpState,NDVI\n';
    const rows = telemetryHistory.map(r => 
      `"${r.lastUpdated}",${r.soilMoisture},${r.soilTemperature},${r.ambientTemperature},${r.ambientHumidity},${r.solarRadiation},${r.nitrogen},${r.phosphorus},${r.potassium},${r.reservoirLevel},${r.pumpState},${r.ndviIndex}`
    ).join('\n');

    res.writeHead(200, {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="smart_agri_telemetry.csv"'
    });
    res.end(headers + rows);
    return;
  }

  // 6. REST API: Health Check
  if (pathname === '/api/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ONLINE',
      uptimeSeconds: Math.floor(process.uptime()),
      scenario: simulator.scenario,
      activeClients: sseClients.size
    }));
    return;
  }

  // 7. Static Asset Delivery (public directory)
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
  
  // Basic security check to prevent directory traversal
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Access Denied');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      filePath = path.join(PUBLIC_DIR, 'index.html');
    }

    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(500);
        res.end('Server Error loading asset');
        return;
      }
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    });
  });
});

server.listen(PORT, () => {
  console.log(`[AGRI-SYNAPSE] IoT Smart Agriculture Server running on http://localhost:${PORT}`);
  console.log(`[AGRI-SYNAPSE] Remote Demo & Simulation Gateway active.`);
});
