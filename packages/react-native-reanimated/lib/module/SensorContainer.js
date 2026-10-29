'use strict';

import { ReanimatedModule } from './ReanimatedModule';
import Sensor from "./Sensor.js";
export class SensorContainer {
  nativeSensors = new Map();
  // The sensors of a device do not change while the app runs.
  availability = new Map();
  isSensorAvailable(sensorType) {
    let isAvailable = this.availability.get(sensorType);
    if (isAvailable === undefined) {
      isAvailable = ReanimatedModule.isSensorAvailable(sensorType);
      this.availability.set(sensorType, isAvailable);
    }
    return isAvailable;
  }
  getSensorId(sensorType, config) {
    return sensorType * 100 + config.iosReferenceFrame * 10 + Number(config.adjustToInterfaceOrientation);
  }
  initializeSensor(sensorType, config) {
    const sensorId = this.getSensorId(sensorType, config);
    if (!this.nativeSensors.has(sensorId)) {
      this.nativeSensors.set(sensorId, new Sensor(sensorType, config));
    }
    const sensor = this.nativeSensors.get(sensorId);
    return sensor.getSharedValue();
  }
  registerSensor(sensorType, config, handler) {
    const sensorId = this.getSensorId(sensorType, config);
    if (!this.nativeSensors.has(sensorId)) {
      return -1;
    }
    const sensor = this.nativeSensors.get(sensorId);
    if (sensor && sensor.isAvailable() && (sensor.isRunning() || sensor.register(handler))) {
      sensor.listenersNumber++;
      return sensorId;
    }
    return -1;
  }
  unregisterSensor(sensorId) {
    if (this.nativeSensors.has(sensorId)) {
      const sensor = this.nativeSensors.get(sensorId);
      if (sensor && sensor.isRunning()) {
        sensor.listenersNumber--;
        if (sensor.listenersNumber === 0) {
          sensor.unregister();
        }
      }
    }
  }
}
//# sourceMappingURL=SensorContainer.js.map