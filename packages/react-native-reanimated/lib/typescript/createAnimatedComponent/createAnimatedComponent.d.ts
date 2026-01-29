import '../layoutReanimation/animationsManager';
import type { ComponentClass, ComponentType, FunctionComponent } from 'react';
import type { FlatList, FlatListProps } from 'react-native';
import type { AnimatedComponentType } from '../helperTypes';
import type { AnimatedComponentRef } from './commonTypes';
type Options<P> = {
  setNativeProps?: (ref: AnimatedComponentRef, props: P) => void;
  /**
   * Discord enables a performance improvement, which causes us to sync back
   * any animated props from the UI thread back to react JS. Switching this to
   * `true` disables this behavior. Default is `false`.
   */
  disableReactSync?: boolean;
};
/**
 * Lets you create an Animated version of any React Native component.
 *
 * @param component - The component you want to make animatable.
 * @returns A component that Reanimated is capable of animating.
 * @see https://docs.swmansion.com/react-native-reanimated/docs/core/createAnimatedComponent
 */
export declare function createAnimatedComponent<P extends object>(
  component: FunctionComponent<P>,
  options?: Options<P>
): AnimatedComponentType<P>;
export declare function createAnimatedComponent<P extends object>(
  component: ComponentClass<P>,
  options?: Options<P>
): AnimatedComponentType<P>;
export declare function createAnimatedComponent<P extends object>(
  component: ComponentType<P>,
  options?: Options<P>
): AnimatedComponentType<P>;
/**
 * @deprecated Please use `Animated.FlatList` component instead of calling
 *   `Animated.createAnimatedComponent(FlatList)` manually.
 */
export declare function createAnimatedComponent(
  component: typeof FlatList<unknown>,
  options?: Options<FlatListProps<unknown>>
): AnimatedComponentType<FlatListProps<unknown>>;
export {};
//# sourceMappingURL=createAnimatedComponent.d.ts.map
