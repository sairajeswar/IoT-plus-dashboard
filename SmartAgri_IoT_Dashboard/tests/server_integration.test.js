const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { spawn } = require('node:child_process');

test('Server Integration - Boot & HTTP Endpoints Test', async () => {
  const serverProcess = spawn('node', ['server.js'], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: '3099' }
  });

  // Give server 800ms to spin up
  await new Promise(r => setTimeout(r, 800));

  function makeRequest(path) {
    return new Promise((resolve, reject) => {
      http.get(`http://localhost:3099${path}`, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body: data }));
      }).on('error', reject);
    });
  }

  try {
    // 1. Health check
    const health = await makeRequest('/api/health');
    assert.equal(health.statusCode, 200);
    const healthJson = JSON.parse(health.body);
    assert.equal(healthJson.status, 'ONLINE');

    // 2. Telemetry endpoint
    const telem = await makeRequest('/api/telemetry');
    assert.equal(telem.statusCode, 200);
    const telemJson = JSON.parse(telem.body);
    assert.equal(telemJson.success, true);
    assert.equal(typeof telemJson.telemetry.soilMoisture, 'number');

    // 3. Static Index HTML
    const html = await makeRequest('/');
    assert.equal(html.statusCode, 200);
    assert.ok(html.body.includes('AGRI-SYNAPSE'));
  } finally {
    serverProcess.kill('SIGTERM');
  }
});
