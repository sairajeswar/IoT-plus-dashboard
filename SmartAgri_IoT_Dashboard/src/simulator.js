/**
 * Smart Agriculture Virtual Hardware Simulator
 * Simulates physical soil physics, microclimate, and crop sensor nodes
 * for seamless remote demonstrations without physical hardware.
 */

class SmartAgriSimulator {
  constructor(options = {}) {
    this.scenario = options.scenario || 'OPTIMAL'; // OPTIMAL, DROUGHT, HEATWAVE, WATERLOGGED, NUTRIENT_DEFICIT, SENSOR_FAULT
    this.autoIrrigationEnabled = options.autoIrrigation ?? true;
    
    // Physical state of the agricultural plot
    this.state = {
      // Sector 1: Open Crop Field (LoRaWAN Node #01)
      soilMoisture: 48.5,     // % Volumetric Water Content (VWC)
      soilTemperature: 22.4,  // °C
      ambientTemperature: 26.8,// °C
      ambientHumidity: 62.0,  // % Relative Humidity
      solarRadiation: 650,    // W/m²
      nitrogen: 145,          // mg/kg
      phosphorus: 42,         // mg/kg
      potassium: 195,         // mg/kg
      batteryPercent: 94.2,   // %
      rssi: -68,              // dBm (LoRa signal strength)
      
      // Sector 2: Smart Greenhouse & Hydroponic Drip (ESP32 Node #02)
      greenhouseTemp: 24.5,   // °C
      greenhouseHumidity: 70.2,// %
      reservoirLevel: 82.0,   // % Tank capacity
      soilPh: 6.4,            // pH (optimal 6.0 - 6.8)
      electricalConductivity: 1.8, // mS/cm (EC)
      co2Level: 620,          // ppm
      
      // Sector 3: Multispectral Crop Drone Telemetry (Node #03)
      ndviIndex: 0.74,        // Normalized Difference Vegetation Index (0.6 - 0.8 is healthy)
      canopyTemperature: 23.8, // °C
      
      // Actuator states
      pumpState: false,       // Main Irrigation Pump
      valveA: false,          // Zone A Solenoid Valve
      valveB: false,          // Zone B Solenoid Valve
      valveC: false,          // Zone C Solenoid Valve
      misterState: false,     // Greenhouse Mist Sprayer
      shadeActive: false,     // Solar Shading Curtains
      
      // Operational metrics
      totalWaterDeliveredLiters: 1240.5,
      pumpRuntimeMinutes: 0,
      pumpCycleCount: 14,
      lastUpdated: new Date().toISOString()
    };

    // Target threshold settings
    this.thresholds = {
      moistureLowAlert: 30.0,
      moistureAutoStart: 35.0,
      moistureAutoStop: 60.0,
      tempHighAlert: 35.0,
      phMin: 5.8,
      phMax: 7.2,
      maxContinuousPumpMinutes: 45
    };

    // Simulation ticks tracking
    this.tickInterval = null;
  }

  setScenario(name) {
    this.scenario = name.toUpperCase();
    switch (this.scenario) {
      case 'DROUGHT':
        this.state.soilMoisture = 22.0;
        this.state.ambientTemperature = 37.5;
        this.state.ambientHumidity = 24.0;
        this.state.solarRadiation = 920;
        this.state.ndviIndex = 0.42;
        break;
      case 'HEATWAVE':
        this.state.ambientTemperature = 41.2;
        this.state.greenhouseTemp = 36.8;
        this.state.ambientHumidity = 32.0;
        this.state.solarRadiation = 980;
        this.state.soilMoisture = 28.5;
        break;
      case 'WATERLOGGED':
        this.state.soilMoisture = 94.0;
        this.state.ambientHumidity = 95.0;
        this.state.ambientTemperature = 21.0;
        this.state.solarRadiation = 150;
        this.state.ndviIndex = 0.58;
        break;
      case 'NUTRIENT_DEFICIT':
        this.state.nitrogen = 60;
        this.state.phosphorus = 18;
        this.state.potassium = 85;
        this.state.soilPh = 5.2;
        this.state.ndviIndex = 0.48;
        break;
      case 'SENSOR_FAULT':
        this.state.rssi = -118;
        this.state.batteryPercent = 6.4;
        break;
      case 'OPTIMAL':
      default:
        this.scenario = 'OPTIMAL';
        this.state.soilMoisture = 48.0;
        this.state.ambientTemperature = 25.5;
        this.state.ambientHumidity = 60.0;
        this.state.solarRadiation = 620;
        this.state.nitrogen = 140;
        this.state.phosphorus = 40;
        this.state.potassium = 190;
        this.state.soilPh = 6.4;
        this.state.rssi = -70;
        this.state.batteryPercent = 95.0;
        this.state.ndviIndex = 0.76;
        break;
    }
    return this.getState();
  }

  setPump(state) {
    this.state.pumpState = Boolean(state);
    if (this.state.pumpState) {
      this.state.valveA = true;
      this.state.pumpCycleCount += 1;
    } else {
      this.state.valveA = false;
      this.state.pumpRuntimeMinutes = 0;
    }
    return this.getState();
  }

  setMister(state) {
    this.state.misterState = Boolean(state);
    return this.getState();
  }

  setValve(zone, state) {
    if (zone === 'A') this.state.valveA = Boolean(state);
    if (zone === 'B') this.state.valveB = Boolean(state);
    if (zone === 'C') this.state.valveC = Boolean(state);
    return this.getState();
  }

  setThresholds(newThresholds) {
    this.thresholds = { ...this.thresholds, ...newThresholds };
    return this.thresholds;
  }

  /**
   * Physics step simulation tick
   * Models evapotranspiration, solar heating, and irrigation physics.
   */
  tick(deltaSeconds = 3) {
    const s = this.state;
    
    // Evapotranspiration rate (depends on temp, solar radiation, humidity)
    const vaporPressureDeficit = (s.ambientTemperature / 20) * (1 - s.ambientHumidity / 100);
    const solarFactor = Math.max(0.1, s.solarRadiation / 1000);
    const naturalMoistureLoss = 0.04 * vaporPressureDeficit * solarFactor * (deltaSeconds / 3);

    // If pump is active, replenish moisture
    if (s.pumpState) {
      const deliveryLiters = 0.8 * (deltaSeconds / 3); // 0.8 L per interval
      s.totalWaterDeliveredLiters = parseFloat((s.totalWaterDeliveredLiters + deliveryLiters).toFixed(2));
      s.reservoirLevel = Math.max(0, parseFloat((s.reservoirLevel - 0.05).toFixed(2)));
      s.soilMoisture = Math.min(95, parseFloat((s.soilMoisture + 1.25).toFixed(2)));
      s.pumpRuntimeMinutes = parseFloat((s.pumpRuntimeMinutes + (deltaSeconds / 60)).toFixed(2));

      // Automated cutoff if moisture reaches upper comfort limit
      if (this.autoIrrigationEnabled && s.soilMoisture >= this.thresholds.moistureAutoStop) {
        this.setPump(false);
      }

      // Safety interlock against motor burnout
      if (s.pumpRuntimeMinutes >= this.thresholds.maxContinuousPumpMinutes) {
        this.setPump(false);
      }
    } else {
      // Natural soil drying
      s.soilMoisture = Math.max(10, parseFloat((s.soilMoisture - naturalMoistureLoss).toFixed(2)));
      
      // Closed-loop auto-irrigation trigger
      if (this.autoIrrigationEnabled && s.soilMoisture <= this.thresholds.moistureAutoStart) {
        this.setPump(true);
      }
    }

    // Greenhouse climate physics
    if (s.misterState) {
      s.greenhouseHumidity = Math.min(98, parseFloat((s.greenhouseHumidity + 0.8).toFixed(1)));
      s.greenhouseTemp = Math.max(18, parseFloat((s.greenhouseTemp - 0.2).toFixed(1)));
    } else {
      // Gradual drift towards ambient
      s.greenhouseTemp = parseFloat((s.greenhouseTemp + (s.ambientTemperature - s.greenhouseTemp) * 0.03).toFixed(1));
      s.greenhouseHumidity = parseFloat((s.greenhouseHumidity + (s.ambientHumidity - s.greenhouseHumidity) * 0.02).toFixed(1));
    }

    // Solar radiation small fluctuation
    const noise = (Math.random() - 0.5) * 6;
    s.solarRadiation = Math.max(0, Math.min(1100, Math.round(s.solarRadiation + noise)));

    // Soil temperature lags behind ambient
    s.soilTemperature = parseFloat((s.soilTemperature + (s.ambientTemperature - s.soilTemperature) * 0.02).toFixed(1));

    // Slight ambient temperature micro-drift
    s.ambientTemperature = parseFloat((s.ambientTemperature + (Math.random() - 0.5) * 0.15).toFixed(1));
    s.ambientHumidity = parseFloat((s.ambientHumidity + (Math.random() - 0.5) * 0.2).toFixed(1));

    // Battery solar charging during high radiation
    if (s.solarRadiation > 400) {
      s.batteryPercent = Math.min(100, parseFloat((s.batteryPercent + 0.01).toFixed(2)));
    } else {
      s.batteryPercent = Math.max(0, parseFloat((s.batteryPercent - 0.015).toFixed(2)));
    }

    // Dynamic NDVI calculation based on moisture and nutrient balance
    const healthFactor = (s.soilMoisture >= 35 && s.soilMoisture <= 75 ? 0.4 : 0.2) +
                         (s.soilPh >= 6.0 && s.soilPh <= 7.0 ? 0.2 : 0.1) +
                         (s.nitrogen > 100 ? 0.2 : 0.05);
    s.ndviIndex = parseFloat((0.2 + healthFactor * 0.7).toFixed(2));

    s.lastUpdated = new Date().toISOString();
    return this.getState();
  }

  getState() {
    return JSON.parse(JSON.stringify(this.state));
  }
}

module.exports = SmartAgriSimulator;
