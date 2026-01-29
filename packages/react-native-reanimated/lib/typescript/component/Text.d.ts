import { Text } from 'react-native';
interface AnimatedTextComplement extends Text {
  getNode(): Text;
}
export declare const AnimatedText: import('../helperTypes').AnimatedComponentType<
  import('react-native').TextProps
>;
export type AnimatedText = typeof AnimatedText & AnimatedTextComplement;
export {};
//# sourceMappingURL=Text.d.ts.map
