import type { SerializableRef } from 'react-native-worklets';
import type { SensorConfig, SensorValue, SensorValueMap, SharedValue } from './commonTypes';
import { SensorType } from './commonTypes';
export default class Sensor<T extends SensorType = SensorType> {
    listenersNumber: number;
    private sensorId;
    private sensorType;
    private data;
    private config;
    constructor(sensorType: T, config: SensorConfig);
    register(eventHandler: SerializableRef<(data: SensorValue) => void>): boolean;
    isRunning(): boolean;
    isAvailable(): boolean;
    getSharedValue(): SharedValue<SensorValueMap[T]>;
    unregister(): void;
}
//# sourceMappingURL=Sensor.d.ts.map