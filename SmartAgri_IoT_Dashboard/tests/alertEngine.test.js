const test = require('node:test');
const assert = require('node:assert/strict');
const AlertEngine = require('../src/alertEngine.js');

test('AlertEngine - Critical Low Moisture Generates RED Alert', () => {
  const engine = new AlertEngine();
  const telemetry = {
    soilMoisture: 18.2,
    ambientTemperature: 28.0,
    reservoirLevel: 80.0,
    soilPh: 6.5,
    batteryPercent: 90.0,
    rssi: -72,
    ndviIndex: 0.70
  };

  const alerts = engine.evaluate(telemetry);
  const critical = alerts.find(a => a.severity === 'CRITICAL' && a.metric === 'soilMoisture');

  assert.ok(critical, 'Critical alert must be emitted for drought');
  assert.equal(critical.color, 'red');
  assert.equal(critical.code, 'ERR_DROUGHT_CRITICAL');
});

test('AlertEngine - Warning Low Moisture Generates PINK Alert', () => {
  const engine = new AlertEngine();
  const telemetry = {
    soilMoisture: 31.0,
    ambientTemperature: 26.0,
    reservoirLevel: 80.0,
    soilPh: 6.5,
    batteryPercent: 90.0,
    rssi: -72,
    ndviIndex: 0.70
  };

  const alerts = engine.evaluate(telemetry);
  const warning = alerts.find(a => a.severity === 'WARNING' && a.metric === 'soilMoisture');

  assert.ok(warning, 'Warning alert must be emitted for low moisture');
  assert.equal(warning.color, 'pink');
  assert.equal(warning.code, 'WARN_MOISTURE_DEPLETED');
});

test('AlertEngine - High Heat Triggers RED Alert', () => {
  const engine = new AlertEngine();
  const telemetry = {
    soilMoisture: 45.0,
    ambientTemperature: 41.5,
    reservoirLevel: 80.0,
    soilPh: 6.5,
    batteryPercent: 90.0,
    rssi: -72,
    ndviIndex: 0.70
  };

  const alerts = engine.evaluate(telemetry);
  const heatAlert = alerts.find(a => a.severity === 'CRITICAL' && a.metric === 'ambientTemperature');

  assert.ok(heatAlert, 'High heat alert should be critical');
  assert.equal(heatAlert.color, 'red');
  assert.equal(heatAlert.code, 'ERR_THERMAL_STRESS');
});

test('AlertEngine - Soil pH Drift Generates PINK Alert', () => {
  const engine = new AlertEngine();
  const telemetry = {
    soilMoisture: 45.0,
    ambientTemperature: 26.0,
    reservoirLevel: 80.0,
    soilPh: 5.1, // Too acidic
    batteryPercent: 90.0,
    rssi: -72,
    ndviIndex: 0.70
  };

  const alerts = engine.evaluate(telemetry);
  const phAlert = alerts.find(a => a.severity === 'WARNING' && a.metric === 'soilPh');

  assert.ok(phAlert, 'Acidic pH should trigger warning');
  assert.equal(phAlert.color, 'pink');
  assert.equal(phAlert.code, 'WARN_PH_ACIDIC');
});

test('AlertEngine - Nominal Telemetry Returns WHITE INFO Status', () => {
  const engine = new AlertEngine();
  const telemetry = {
    soilMoisture: 52.0,
    ambientTemperature: 24.5,
    reservoirLevel: 85.0,
    soilPh: 6.5,
    batteryPercent: 95.0,
    rssi: -68,
    ndviIndex: 0.75
  };

  const alerts = engine.evaluate(telemetry);
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].severity, 'INFO');
  assert.equal(alerts[0].color, 'white');
  assert.equal(alerts[0].code, 'INFO_NOMINAL');
});
