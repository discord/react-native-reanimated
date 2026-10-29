import type { AnimatedSensor, SensorConfig, SensorValueMap } from '../commonTypes';
import { SensorType } from '../commonTypes';
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
export declare function useAnimatedSensor<T extends SensorType>(sensorType: T, userConfig?: Partial<SensorConfig>): AnimatedSensor<SensorValueMap[T]>;
//# sourceMappingURL=useAnimatedSensor.d.ts.map