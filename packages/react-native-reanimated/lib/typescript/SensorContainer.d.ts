import type { SerializableRef } from 'react-native-worklets';
import type { SensorConfig, SensorType, SensorValue, SensorValueMap, SharedValue } from './commonTypes';
export declare class SensorContainer {
    private nativeSensors;
    private availability;
    isSensorAvailable(sensorType: SensorType): boolean;
    getSensorId(sensorType: SensorType, config: SensorConfig): number;
    initializeSensor<T extends SensorType>(sensorType: T, config: SensorConfig): SharedValue<SensorValueMap[T]>;
    registerSensor(sensorType: SensorType, config: SensorConfig, handler: SerializableRef<(data: SensorValue) => void>): number;
    unregisterSensor(sensorId: number): void;
}
//# sourceMappingURL=SensorContainer.d.ts.map