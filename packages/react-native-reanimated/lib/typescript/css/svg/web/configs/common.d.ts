import type { GestureResponderHandlers } from 'react-native';
import type { AccessibilityProps, ColorProps, DefinitionProps, FillProps, NativeProps, ResponderProps, StrokeProps, TouchableProps, TransformProps } from 'react-native-svg';
import { type PropsBuilderConfig } from '../../../../common/web';
declare const colorProps: PropsBuilderConfig<ColorProps>;
declare const fillProps: PropsBuilderConfig<FillProps>;
declare const strokeProps: PropsBuilderConfig<StrokeProps>;
declare const transformProps: PropsBuilderConfig<TransformProps>;
declare const responderProps: PropsBuilderConfig<Omit<ResponderProps, keyof GestureResponderHandlers>>;
type NonAnimatablePropNames = keyof GestureResponderHandlers | keyof TouchableProps | keyof DefinitionProps | keyof NativeProps | keyof AccessibilityProps;
export type SvgStyleBuilderConfig<T> = PropsBuilderConfig<Omit<T, NonAnimatablePropNames>>;
export declare const SVG_COMMON_WEB_PROPERTIES_CONFIG: typeof colorProps & typeof fillProps & typeof strokeProps & typeof transformProps & typeof responderProps & {
    readonly opacity: true;
};
export {};
//# sourceMappingURL=common.d.ts.map