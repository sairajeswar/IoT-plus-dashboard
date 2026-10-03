const test = require('node:test');
const assert = require('node:assert/strict');
const SmartAgriSimulator = require('../src/simulator.js');

test('SmartAgriSimulator - Initial State & Defaults', () => {
  const sim = new SmartAgriSimulator();
  const state = sim.getState();
  
  assert.equal(typeof state.soilMoisture, 'number');
  assert.equal(state.soilMoisture > 0, true);
  assert.equal(state.pumpState, false);
  assert.equal(state.valveA, false);
  assert.equal(state.batteryPercent > 80, true);
});

test('SmartAgriSimulator - Evapotranspiration & Natural Drying', () => {
  const sim = new SmartAgriSimulator({ autoIrrigation: false });
  sim.state.soilMoisture = 50.0;
  sim.state.solarRadiation = 800;
  sim.state.ambientTemperature = 32.0;
  sim.state.ambientHumidity = 40.0;
  
  // Advance simulation tick
  sim.tick(10);
  const updated = sim.getState();
  
  assert.equal(updated.soilMoisture < 50.0, true, 'Soil moisture should decrease without irrigation');
});

test('SmartAgriSimulator - Irrigation Pump Replenishment', () => {
  const sim = new SmartAgriSimulator({ autoIrrigation: false });
  sim.state.soilMoisture = 30.0;
  const initialWaterDelivered = sim.state.totalWaterDeliveredLiters;
  
  sim.setPump(true);
  assert.equal(sim.state.pumpState, true);
  assert.equal(sim.state.valveA, true);

  sim.tick(6);
  const updated = sim.getState();
  
  assert.equal(updated.soilMoisture > 30.0, true, 'Moisture should increase when pump is running');
  assert.equal(updated.totalWaterDeliveredLiters > initialWaterDelivered, true);
});

test('SmartAgriSimulator - Scenario Switching', () => {
  const sim = new SmartAgriSimulator();

  sim.setScenario('DROUGHT');
  assert.equal(sim.scenario, 'DROUGHT');
  assert.equal(sim.state.soilMoisture <= 25.0, true);
  assert.equal(sim.state.ambientTemperature >= 35.0, true);

  sim.setScenario('HEATWAVE');
  assert.equal(sim.scenario, 'HEATWAVE');
  assert.equal(sim.state.ambientTemperature > 40.0, true);

  sim.setScenario('WATERLOGGED');
  assert.equal(sim.scenario, 'WATERLOGGED');
  assert.equal(sim.state.soilMoisture >= 90.0, true);

  sim.setScenario('OPTIMAL');
  assert.equal(sim.scenario, 'OPTIMAL');
  assert.equal(sim.state.soilMoisture, 48.0);
});

test('SmartAgriSimulator - Closed Loop Auto-Irrigation Cycle', () => {
  const sim = new SmartAgriSimulator({ autoIrrigation: true });
  sim.thresholds.moistureAutoStart = 35.0;
  sim.thresholds.moistureAutoStop = 55.0;

  // Simulate drop below start threshold
  sim.state.soilMoisture = 34.0;
  sim.setPump(false);
  sim.tick(3);
  
  assert.equal(sim.state.pumpState, true, 'Pump should auto-activate below start threshold');

  // Push moisture above cutoff threshold
  sim.state.soilMoisture = 55.5;
  sim.tick(3);
  assert.equal(sim.state.pumpState, false, 'Pump should auto-shutoff when target moisture is reached');
});
