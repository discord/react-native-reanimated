import type { ColorValue } from 'react-native';
import { type ProcessedColor, type ValueProcessor } from '../../../../common';
export declare const ERROR_MESSAGES: {
    invalidColor: (color: unknown) => string;
};
export declare const processColorSVG: ValueProcessor<ColorValue | number, number | false | string>;
export declare const processColorOrPlatformColorSVG: ValueProcessor<ColorValue | number, number | false | string | ProcessedColor>;
//# sourceMappingURL=colors.d.ts.map