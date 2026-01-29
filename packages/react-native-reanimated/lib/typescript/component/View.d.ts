import { View } from 'react-native';
interface AnimatedViewComplement extends View {
  getNode(): View;
}
export declare const AnimatedView: import('../helperTypes').AnimatedComponentType<
  import('react-native').ViewProps
>;
export type AnimatedView = typeof AnimatedView & AnimatedViewComplement;
export {};
//# sourceMappingURL=View.d.ts.map
