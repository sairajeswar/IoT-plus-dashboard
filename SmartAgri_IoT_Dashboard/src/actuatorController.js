/**
 * Smart Agriculture Actuator Controller
 * Provides safe switching, automated closed-loop rules, and safety interlocks
 * for irrigation pumps, solenoid valves, and microclimate misters.
 */

class ActuatorController {
  constructor(simulator) {
    this.simulator = simulator;
    this.emergencyLock = false;
    this.safetyLimits = {
      minReservoirForPump: 10.0, // %
      maxContinuousMinutes: 30,  // minutes
    };
  }

  triggerEmergencyStop() {
    this.emergencyLock = true;
    this.simulator.setPump(false);
    this.simulator.setMister(false);
    this.simulator.setValve('A', false);
    this.simulator.setValve('B', false);
    this.simulator.setValve('C', false);
    return {
      status: 'EMERGENCY_HALT',
      message: 'All actuators forcefully disengaged. Interlock active.',
      state: this.simulator.getState()
    };
  }

  clearEmergencyStop() {
    this.emergencyLock = false;
    return {
      status: 'NORMAL',
      message: 'Emergency lock released. System returned to operational readiness.',
      state: this.simulator.getState()
    };
  }

  setPump(state) {
    if (this.emergencyLock) {
      throw new Error('Action blocked: Emergency Lock is active. Clear emergency stop first.');
    }

    const currentState = this.simulator.getState();
    if (state && currentState.reservoirLevel <= this.safetyLimits.minReservoirForPump) {
      throw new Error(`Safety interlock: Reservoir tank level (${currentState.reservoirLevel}%) is below minimum required (${this.safetyLimits.minReservoirForPump}%). Pump start inhibited.`);
    }

    return this.simulator.setPump(state);
  }

  setMister(state) {
    if (this.emergencyLock) {
      throw new Error('Action blocked: Emergency Lock is active.');
    }
    return this.simulator.setMister(state);
  }

  setValve(zone, state) {
    if (this.emergencyLock) {
      throw new Error('Action blocked: Emergency Lock is active.');
    }
    return this.simulator.setValve(zone, state);
  }

  toggleAutoIrrigation(enabled) {
    this.simulator.autoIrrigationEnabled = Boolean(enabled);
    return {
      autoIrrigationEnabled: this.simulator.autoIrrigationEnabled
    };
  }
}

module.exports = ActuatorController;
