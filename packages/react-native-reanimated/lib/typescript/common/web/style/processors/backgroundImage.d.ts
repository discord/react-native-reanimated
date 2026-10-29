import type { ViewStyle } from 'react-native';
import type { ValueProcessor } from '../types';
type BackgroundImageStyleValue = NonNullable<ViewStyle[Extract<keyof ViewStyle, 'backgroundImage' | 'experimental_backgroundImage'>]>;
export declare const processBackgroundImageWeb: ValueProcessor<BackgroundImageStyleValue>;
export {};
//# sourceMappingURL=backgroundImage.d.ts.map