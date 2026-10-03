const test = require('node:test');
const assert = require('node:assert/strict');
const SmartAgriSimulator = require('../src/simulator.js');
const ActuatorController = require('../src/actuatorController.js');

test('ActuatorController - Manual Pump and Valve Control', () => {
  const sim = new SmartAgriSimulator();
  const ctrl = new ActuatorController(sim);

  ctrl.setPump(true);
  assert.equal(sim.state.pumpState, true);
  assert.equal(sim.state.valveA, true);

  ctrl.setValve('B', true);
  assert.equal(sim.state.valveB, true);

  ctrl.setPump(false);
  assert.equal(sim.state.pumpState, false);
});

test('ActuatorController - Emergency Stop Forcefully Disengages All', () => {
  const sim = new SmartAgriSimulator();
  const ctrl = new ActuatorController(sim);

  ctrl.setPump(true);
  ctrl.setMister(true);
  ctrl.setValve('B', true);
  ctrl.setValve('C', true);

  const res = ctrl.triggerEmergencyStop();
  assert.equal(res.status, 'EMERGENCY_HALT');
  assert.equal(sim.state.pumpState, false);
  assert.equal(sim.state.misterState, false);
  assert.equal(sim.state.valveA, false);
  assert.equal(sim.state.valveB, false);
  assert.equal(sim.state.valveC, false);

  // Attempting to actuate during emergency stop must throw
  assert.throws(() => {
    ctrl.setPump(true);
  }, /Emergency Lock is active/);

  // Clearing lock allows operation again
  ctrl.clearEmergencyStop();
  assert.doesNotThrow(() => {
    ctrl.setPump(true);
  });
});

test('ActuatorController - Low Reservoir Inhibits Pump Start', () => {
  const sim = new SmartAgriSimulator();
  const ctrl = new ActuatorController(sim);

  sim.state.reservoirLevel = 5.0; // Critically low tank level (< 10%)

  assert.throws(() => {
    ctrl.setPump(true);
  }, /Reservoir tank level .* below minimum required/);
});
