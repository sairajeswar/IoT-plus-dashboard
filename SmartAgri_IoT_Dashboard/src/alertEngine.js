/**
 * Smart Agriculture Alert Engine
 * Evaluates real-time telemetry against agronomic thresholds and assigns
 * severity levels (CRITICAL = Red, WARNING = Pink, INFO = White)
 */

class AlertEngine {
  constructor(thresholds = {}) {
    this.thresholds = {
      moistureCriticalLow: 25.0,
      moistureWarningLow: 35.0,
      moistureWaterlogged: 85.0,
      tempCriticalHigh: 38.0,
      tempWarningHigh: 34.0,
      tempCriticalLow: 4.0,
      phMin: 5.5,
      phMax: 7.5,
      reservoirCriticalLow: 15.0,
      batteryWarningLow: 20.0,
      batteryCriticalLow: 8.0,
      rssiCriticalLow: -110,
      ndviWarningLow: 0.50,
      ...thresholds
    };
  }

  evaluate(telemetry) {
    const alerts = [];
    const timestamp = telemetry.lastUpdated || new Date().toISOString();

    // 1. Soil Moisture Checks
    if (telemetry.soilMoisture < this.thresholds.moistureCriticalLow) {
      alerts.push({
        id: `ALT-MOIST-CRIT-${Date.now()}`,
        severity: 'CRITICAL',
        color: 'red',
        code: 'ERR_DROUGHT_CRITICAL',
        title: 'Severe Root Desiccation Risk',
        message: `Soil moisture at ${telemetry.soilMoisture}% is critically below safe threshold (${this.thresholds.moistureCriticalLow}%). Immediate irrigation required.`,
        node: 'Field Node #01',
        metric: 'soilMoisture',
        value: telemetry.soilMoisture,
        timestamp
      });
    } else if (telemetry.soilMoisture < this.thresholds.moistureWarningLow) {
      alerts.push({
        id: `ALT-MOIST-WARN-${Date.now()}`,
        severity: 'WARNING',
        color: 'pink',
        code: 'WARN_MOISTURE_DEPLETED',
        title: 'Depleted Soil Moisture',
        message: `Soil moisture at ${telemetry.soilMoisture}% has dipped below optimal zone (${this.thresholds.moistureWarningLow}%).`,
        node: 'Field Node #01',
        metric: 'soilMoisture',
        value: telemetry.soilMoisture,
        timestamp
      });
    } else if (telemetry.soilMoisture > this.thresholds.moistureWaterlogged) {
      alerts.push({
        id: `ALT-MOIST-LOG-${Date.now()}`,
        severity: 'WARNING',
        color: 'pink',
        code: 'WARN_WATERLOGGING',
        title: 'Soil Waterlogging Detected',
        message: `Soil moisture is saturated at ${telemetry.soilMoisture}%. Potential root hypoxia risk.`,
        node: 'Field Node #01',
        metric: 'soilMoisture',
        value: telemetry.soilMoisture,
        timestamp
      });
    }

    // 2. Temperature Checks
    if (telemetry.ambientTemperature > this.thresholds.tempCriticalHigh) {
      alerts.push({
        id: `ALT-TEMP-CRIT-HI-${Date.now()}`,
        severity: 'CRITICAL',
        color: 'red',
        code: 'ERR_THERMAL_STRESS',
        title: 'Extreme Canopy Heat Stress',
        message: `Ambient temperature reached ${telemetry.ambientTemperature}°C (Critical Limit: ${this.thresholds.tempCriticalHigh}°C). Evaporative misting recommended.`,
        node: 'Field Node #01',
        metric: 'ambientTemperature',
        value: telemetry.ambientTemperature,
        timestamp
      });
    } else if (telemetry.ambientTemperature > this.thresholds.tempWarningHigh) {
      alerts.push({
        id: `ALT-TEMP-WARN-HI-${Date.now()}`,
        severity: 'WARNING',
        color: 'pink',
        code: 'WARN_TEMP_ELEVATED',
        title: 'Elevated Temperature Advisory',
        message: `Field temperature at ${telemetry.ambientTemperature}°C is higher than normal.`,
        node: 'Field Node #01',
        metric: 'ambientTemperature',
        value: telemetry.ambientTemperature,
        timestamp
      });
    } else if (telemetry.ambientTemperature < this.thresholds.tempCriticalLow) {
      alerts.push({
        id: `ALT-TEMP-CRIT-LO-${Date.now()}`,
        severity: 'CRITICAL',
        color: 'red',
        code: 'ERR_FROST_RISK',
        title: 'Frost Threat Warning',
        message: `Ambient temperature dropped to ${telemetry.ambientTemperature}°C. Crop tissue freeze imminent.`,
        node: 'Field Node #01',
        metric: 'ambientTemperature',
        value: telemetry.ambientTemperature,
        timestamp
      });
    }

    // 3. Reservoir Water Level
    if (telemetry.reservoirLevel < this.thresholds.reservoirCriticalLow) {
      alerts.push({
        id: `ALT-RES-CRIT-${Date.now()}`,
        severity: 'CRITICAL',
        color: 'red',
        code: 'ERR_RESERVOIR_LOW',
        title: 'Irrigation Reservoir Depleted',
        message: `Water tank capacity is at ${telemetry.reservoirLevel}%. Irrigation pumps risk dry cavitation.`,
        node: 'Greenhouse Node #02',
        metric: 'reservoirLevel',
        value: telemetry.reservoirLevel,
        timestamp
      });
    }

    // 4. Soil pH Checks
    if (telemetry.soilPh < this.thresholds.phMin) {
      alerts.push({
        id: `ALT-PH-LO-${Date.now()}`,
        severity: 'WARNING',
        color: 'pink',
        code: 'WARN_PH_ACIDIC',
        title: 'Acidic Soil Drift',
        message: `Soil pH has dropped to ${telemetry.soilPh}. Nutrient uptake efficiency impaired.`,
        node: 'Greenhouse Node #02',
        metric: 'soilPh',
        value: telemetry.soilPh,
        timestamp
      });
    } else if (telemetry.soilPh > this.thresholds.phMax) {
      alerts.push({
        id: `ALT-PH-HI-${Date.now()}`,
        severity: 'WARNING',
        color: 'pink',
        code: 'WARN_PH_ALKALINE',
        title: 'Alkaline Soil Drift',
        message: `Soil pH reached ${telemetry.soilPh}. Micro-nutrient lockout may occur.`,
        node: 'Greenhouse Node #02',
        metric: 'soilPh',
        value: telemetry.soilPh,
        timestamp
      });
    }

    // 5. Battery and Signal
    if (telemetry.batteryPercent < this.thresholds.batteryCriticalLow) {
      alerts.push({
        id: `ALT-BAT-CRIT-${Date.now()}`,
        severity: 'CRITICAL',
        color: 'red',
        code: 'ERR_BATTERY_DEAD',
        title: 'Node Battery Depleted',
        message: `LoRa node battery at ${telemetry.batteryPercent}%. Hardware will shut down shortly.`,
        node: 'Field Node #01',
        metric: 'batteryPercent',
        value: telemetry.batteryPercent,
        timestamp
      });
    } else if (telemetry.batteryPercent < this.thresholds.batteryWarningLow) {
      alerts.push({
        id: `ALT-BAT-WARN-${Date.now()}`,
        severity: 'WARNING',
        color: 'pink',
        code: 'WARN_BATTERY_LOW',
        title: 'Low Node Battery',
        message: `Battery at ${telemetry.batteryPercent}%. Solar panel harvesting check recommended.`,
        node: 'Field Node #01',
        metric: 'batteryPercent',
        value: telemetry.batteryPercent,
        timestamp
      });
    }

    if (telemetry.rssi < this.thresholds.rssiCriticalLow) {
      alerts.push({
        id: `ALT-RF-WARN-${Date.now()}`,
        severity: 'WARNING',
        color: 'pink',
        code: 'WARN_RF_PACKET_LOSS',
        title: 'Degraded LoRa RSSI Link',
        message: `Signal strength at ${telemetry.rssi} dBm. Packet drop expected.`,
        node: 'Field Node #01',
        metric: 'rssi',
        value: telemetry.rssi,
        timestamp
      });
    }

    // 6. Drone NDVI Canopy Health
    if (telemetry.ndviIndex < this.thresholds.ndviWarningLow) {
      alerts.push({
        id: `ALT-NDVI-WARN-${Date.now()}`,
        severity: 'WARNING',
        color: 'pink',
        code: 'WARN_NDVI_STRESS',
        title: 'Vegetation Chlorophyll Stress',
        message: `Canopy NDVI index is ${telemetry.ndviIndex} (< ${this.thresholds.ndviWarningLow}). Crop vigor weakened.`,
        node: 'Drone Aerial Node #03',
        metric: 'ndviIndex',
        value: telemetry.ndviIndex,
        timestamp
      });
    }

    // If no warnings/critical alerts, return operational info
    if (alerts.length === 0) {
      alerts.push({
        id: `ALT-INFO-NOMINAL-${Date.now()}`,
        severity: 'INFO',
        color: 'white',
        code: 'INFO_NOMINAL',
        title: 'All Systems Operating Nominally',
        message: 'Soil moisture, temperatures, and nutrient balance are within optimal agronomic windows.',
        node: 'All Nodes',
        metric: 'status',
        value: 'HEALTHY',
        timestamp
      });
    }

    return alerts;
  }
}

module.exports = AlertEngine;
