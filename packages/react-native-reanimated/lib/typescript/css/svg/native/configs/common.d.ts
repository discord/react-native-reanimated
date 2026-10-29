import type { GestureResponderHandlers } from 'react-native';
import type { AccessibilityProps, ClipProps, ColorProps, CommonFilterProps, CommonMarkerProps, CommonMaskProps, DefinitionProps, FillProps, NativeProps, ResponderProps, StrokeProps, TouchableProps, TransformProps } from 'react-native-svg';
import type { PropsBuilderConfig } from '../../../../common';
import { processPercentage } from '../processors';
declare const colorProps: PropsBuilderConfig<ColorProps>;
declare const fillProps: PropsBuilderConfig<FillProps>;
declare const strokeProps: PropsBuilderConfig<StrokeProps>;
declare const clipProps: PropsBuilderConfig<ClipProps>;
declare const transformProps: PropsBuilderConfig<TransformProps>;
declare const responderProps: PropsBuilderConfig<Omit<ResponderProps, keyof GestureResponderHandlers>>;
declare const commonMarkerProps: PropsBuilderConfig<CommonMarkerProps>;
declare const commonMaskProps: PropsBuilderConfig<CommonMaskProps>;
declare const commonFilterProps: PropsBuilderConfig<CommonFilterProps>;
type NonAnimatablePropNames = keyof GestureResponderHandlers | keyof TouchableProps | keyof DefinitionProps | keyof NativeProps | keyof AccessibilityProps;
export type SvgStyleBuilderConfig<T> = PropsBuilderConfig<Omit<T, NonAnimatablePropNames>>;
export declare const SVG_COMMON_PROPERTIES_CONFIG: typeof colorProps & typeof fillProps & typeof strokeProps & typeof clipProps & typeof transformProps & typeof responderProps & typeof commonMarkerProps & typeof commonMaskProps & typeof commonFilterProps & {
    readonly opacity: {
        readonly process: typeof processPercentage;
    };
};
export {};
//# sourceMappingURL=common.d.ts.map