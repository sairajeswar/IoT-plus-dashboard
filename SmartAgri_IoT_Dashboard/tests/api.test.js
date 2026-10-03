const test = require('node:test');
const assert = require('node:assert/strict');
const SmartAgriSimulator = require('../src/simulator.js');
const AlertEngine = require('../src/alertEngine.js');

test('API Data Model - Serialization & Field Invariants', () => {
  const sim = new SmartAgriSimulator();
  const alertEngine = new AlertEngine();
  const state = sim.getState();
  const alerts = alertEngine.evaluate(state);

  const payload = {
    success: true,
    telemetry: state,
    alerts,
    timestamp: new Date().toISOString()
  };

  assert.equal(typeof payload.telemetry.soilMoisture, 'number');
  assert.equal(typeof payload.telemetry.ambientTemperature, 'number');
  assert.equal(typeof payload.telemetry.soilPh, 'number');
  assert.equal(Array.isArray(payload.alerts), true);
  assert.ok(payload.alerts.length > 0);
});

test('API Data Model - Threshold Updates', () => {
  const sim = new SmartAgriSimulator();
  
  const updated = sim.setThresholds({
    moistureAutoStart: 40.0,
    moistureAutoStop: 65.0
  });

  assert.equal(updated.moistureAutoStart, 40.0);
  assert.equal(updated.moistureAutoStop, 65.0);
});
