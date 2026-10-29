'use strict';

import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { InterfaceOrientation, IOSReferenceFrame, SensorType } from "../commonTypes.js";
import { initializeSensor, isSensorAvailable, registerSensor, unregisterSensor } from "../core.js";

// euler angles are in order ZXY, z = yaw, x = pitch, y = roll
// https://github.com/mrdoob/three.js/blob/dev/src/math/Quaternion.js#L237
function eulerToQuaternion(pitch, roll, yaw) {
  'worklet';

  const c1 = Math.cos(pitch / 2);
  const s1 = Math.sin(pitch / 2);
  const c2 = Math.cos(roll / 2);
  const s2 = Math.sin(roll / 2);
  const c3 = Math.cos(yaw / 2);
  const s3 = Math.sin(yaw / 2);
  return [s1 * c2 * c3 - c1 * s2 * s3, c1 * s2 * c3 + s1 * c2 * s3, c1 * c2 * s3 + s1 * s2 * c3, c1 * c2 * c3 - s1 * s2 * s3];
}
function adjustRotationToInterfaceOrientation(data) {
  'worklet';

  const {
    interfaceOrientation,
    pitch,
    roll,
    yaw
  } = data;
  if (interfaceOrientation === InterfaceOrientation.ROTATION_90) {
    data.pitch = roll;
    data.roll = -pitch;
    data.yaw = yaw - Math.PI / 2;
  } else if (interfaceOrientation === InterfaceOrientation.ROTATION_270) {
    data.pitch = -roll;
    data.roll = pitch;
    data.yaw = yaw + Math.PI / 2;
  } else if (interfaceOrientation === InterfaceOrientation.ROTATION_180) {
    data.pitch *= -1;
    data.roll *= -1;
    data.yaw *= -1;
  }
  const q = eulerToQuaternion(data.pitch, data.roll, data.yaw);
  data.qx = q[0];
  data.qy = q[1];
  data.qz = q[2];
  data.qw = q[3];
  return data;
}
function adjustVectorToInterfaceOrientation(data) {
  'worklet';

  const {
    interfaceOrientation,
    x,
    y
  } = data;
  if (interfaceOrientation === InterfaceOrientation.ROTATION_90) {
    data.x = -y;
    data.y = x;
  } else if (interfaceOrientation === InterfaceOrientation.ROTATION_270) {
    data.x = y;
    data.y = -x;
  } else if (interfaceOrientation === InterfaceOrientation.ROTATION_180) {
    data.x *= -1;
    data.y *= -1;
  }
  return data;
}
function adjustDataToInterfaceOrientation(sensorType, data) {
  'worklet';

  switch (sensorType) {
    case SensorType.ACCELEROMETER:
    case SensorType.GYROSCOPE:
    case SensorType.GRAVITY:
    case SensorType.MAGNETIC_FIELD:
      return adjustVectorToInterfaceOrientation(data);
    case SensorType.ROTATION:
      return adjustRotationToInterfaceOrientation(data);
  }
}
const NOOP = () => {
  // NOOP
};
const subscribeToSensorAvailability = () => NOOP;
const getServerSensorAvailability = () => false;

/**
 * Lets you create animations based on data from the device's sensors.
 *
 * @param sensorType - Type of the sensor to use. Configured with
 *   {@link SensorType} enum.
 * @param config - The sensor configuration - {@link SensorConfig}.
 * @returns An object containing the sensor measurements [shared
 *   value](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary#shared-value)
 *   and a function to unregister the sensor
 * @see https://docs.swmansion.com/react-native-reanimated/docs/device/useAnimatedSensor
 */
export function useAnimatedSensor(sensorType, userConfig) {
  const {
    interval = 'auto',
    adjustToInterfaceOrientation = true,
    iosReferenceFrame = IOSReferenceFrame.Auto
  } = userConfig ?? {};
  const config = useMemo(() => ({
    interval,
    adjustToInterfaceOrientation,
    iosReferenceFrame
  }), [interval, adjustToInterfaceOrientation, iosReferenceFrame]);
  const getSensorAvailability = useCallback(() => isSensorAvailable(sensorType), [sensorType]);
  const isAvailable = useSyncExternalStore(subscribeToSensorAvailability, getSensorAvailability, getServerSensorAvailability);
  const sensor = useMemo(() => initializeSensor(sensorType, config), [sensorType, config]);
  const registrationRef = useRef({
    sensorType,
    config,
    unregister: NOOP
  });
  useEffect(() => {
    const id = registerSensor(sensorType, config, data => {
      'worklet';

      sensor.value = adjustToInterfaceOrientation ? adjustDataToInterfaceOrientation(sensorType, data) : data;
    });
    let isRegistered = id !== -1;
    const unregister = () => {
      if (isRegistered) {
        isRegistered = false;
        unregisterSensor(id);
      }
    };
    registrationRef.current = {
      sensorType,
      config,
      unregister
    };
    return unregister;
  }, [sensorType, config, sensor, adjustToInterfaceOrientation]);
  return useMemo(() => ({
    sensor,
    isAvailable,
    config,
    unregister: () => {
      const registration = registrationRef.current;
      if (registration.sensorType === sensorType && registration.config === config) {
        registration.unregister();
      }
    }
  }), [sensorType, sensor, isAvailable, config]);
}
//# sourceMappingURL=useAnimatedSensor.js.map