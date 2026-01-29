'use strict';
import '../layoutReanimation/animationsManager';

import invariant from 'invariant';
import type {
  Component,
  ComponentClass,
  ComponentType,
  FunctionComponent,
  PropsWithoutRef,
  Ref,
  RefObject,
} from 'react';
import React from 'react';
import type { FlatList, FlatListProps } from 'react-native';
import { Platform, processColor, StyleSheet } from 'react-native';

import { getReduceMotionFromConfig } from '../animation/util';
import { maybeBuild } from '../animationBuilder';
import type { ShadowNodeWrapper, StyleProps } from '../commonTypes';
import { LayoutAnimationType } from '../commonTypes';
import { SkipEnteringContext } from '../component/LayoutAnimationConfig';
import { adaptViewConfig } from '../ConfigHelper';
import {
  enableLayoutAnimations,
  markNodeAsRemovable,
  setNodeRemovalCallback,
  unmarkNodeAsRemovable,
} from '../core';
import { ReanimatedError } from '../errors';
import { getShadowNodeWrapperFromRef } from '../fabricUtils';
import type { AnimatedComponentType } from '../helperTypes';
import type { AnimatedStyleHandle } from '../hook/commonTypes';
import type { BaseAnimationBuilder } from '../layoutReanimation';
import { SharedTransition } from '../layoutReanimation';
import {
  configureWebLayoutAnimations,
  getReducedMotionFromConfig,
  saveSnapshot,
  startWebLayoutAnimation,
  tryActivateLayoutTransition,
} from '../layoutReanimation/web';
import type { CustomConfig } from '../layoutReanimation/web/config';
import { addHTMLMutationObserver } from '../layoutReanimation/web/domUtils';
import { findHostInstance } from '../platform-specific/findHostInstance';
import {
  isFabric,
  isJest,
  isReact19,
  isWeb,
  shouldBeUseWeb,
} from '../PlatformChecker';
import { PropsRegistryGarbageCollector } from '../PropsRegistryGarbageCollector';
import { componentWithRef } from '../reactUtils';
import type { ReanimatedHTMLElement } from '../ReanimatedModule/js-reanimated';
import { updateLayoutAnimations } from '../UpdateLayoutAnimations';
import { ComponentRegistry } from '../updateProps/ComponentRegistry';
import type {
  AnimatedComponentProps,
  AnimatedComponentRef,
  AnimatedProps,
  IAnimatedComponentInternal,
  INativeEventsManager,
  InitialComponentProps,
  LayoutAnimationOrBuilder,
  NestedArray,
  ViewInfo,
} from './commonTypes';
import { getViewInfo } from './getViewInfo';
import { InlinePropManager } from './InlinePropManager';
import JSPropsUpdater from './JSPropsUpdater';
import { NativeEventsManager } from './NativeEventsManager';
import { PropsFilter } from './PropsFilter';
import setAndForwardRef from './setAndForwardRef';
import { flattenArray } from './utils';

const IS_WEB = isWeb();
const IS_JEST = isJest();
const IS_REACT_19 = isReact19();
const SHOULD_BE_USE_WEB = shouldBeUseWeb();

if (IS_WEB) {
  configureWebLayoutAnimations();
}

// Register callback for freeze detection (Fabric only)
// Extends PR #7316's markNodeAsRemovable infrastructure with Suspense-based freeze detection
if (isFabric()) {
  setNodeRemovalCallback((tag: number, isFrozen: boolean) => {
    const component = ComponentRegistry.getComponent(tag);
    if (!component || !component._willUnmount) {
      // Skip if component doesn't exist or already handled (remounted before callback fired)
      return;
    }

    if (!isFrozen) {
      // Component truly unmounted - safe to clean up
      component._detachStyles();
      ComponentRegistry.unregister(tag);
    }

    // Always clear flag whether frozen or unmounted
    component._willUnmount = false;
  });
}

function onlyAnimatedStyles(styles: StyleProps[]): StyleProps[] {
  return styles.filter((style) => style?.viewDescriptors);
}

type Options<P> = {
  setNativeProps?: (ref: AnimatedComponentRef, props: P) => void;
  /**
   * Discord enables a performance improvement, which causes us to sync back any
   * animated props from the UI thread back to react JS. Switching this to
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

// Don't change the order of overloads, since such a change breaks current behavior
export function createAnimatedComponent<P extends object>(
  component: FunctionComponent<P>,
  options?: Options<P>
): AnimatedComponentType<P>;

export function createAnimatedComponent<P extends object>(
  component: ComponentClass<P>,
  options?: Options<P>
): AnimatedComponentType<P>;

export function createAnimatedComponent<P extends object>(
  // Actually ComponentType<P = {}> = ComponentClass<P> | FunctionComponent<P> but we need this overload too
  // since some external components (like FastImage) are typed just as ComponentType
  component: ComponentType<P>,
  options?: Options<P>
): AnimatedComponentType<P>;

/**
 * @deprecated Please use `Animated.FlatList` component instead of calling
 *   `Animated.createAnimatedComponent(FlatList)` manually.
 */
// @ts-ignore This is required to create this overload, since type of createAnimatedComponent is incorrect and doesn't include typeof FlatList
export function createAnimatedComponent(
  component: typeof FlatList<unknown>,
  options?: Options<FlatListProps<unknown>>
): AnimatedComponentType<FlatListProps<unknown>>;

let id = 0;

export function createAnimatedComponent(
  Component: ComponentType<InitialComponentProps>,
  options?: Options<InitialComponentProps>
): AnimatedComponentType<InitialComponentProps> {
  if (!IS_REACT_19) {
    invariant(
      typeof Component !== 'function' ||
        (Component.prototype && Component.prototype.isReactComponent),
      `Looks like you're passing a function component \`${Component.name}\` to \`createAnimatedComponent\` function which supports only class components. Please wrap your function component with \`React.forwardRef()\` or use a class component instead.`
    );
  }

  class AnimatedComponent
    extends React.Component<
      AnimatedComponentProps<InitialComponentProps>,
      { reanimatedProps: { [key: string]: unknown }; settledProps: StyleProps }
    >
    implements IAnimatedComponentInternal
  {
    _styles: StyleProps[] | null = null;
    _animatedProps?: Partial<AnimatedComponentProps<AnimatedProps>>;
    _isFirstRender = true;
    jestInlineStyle: NestedArray<StyleProps> | undefined;
    jestAnimatedStyle: { value: StyleProps } = { value: {} };
    jestAnimatedProps: { value: AnimatedProps } = { value: {} };
    _componentRef: AnimatedComponentRef | HTMLElement | null = null;
    _hasAnimatedRef = false;
    // Used only on web
    _componentDOMRef: HTMLElement | null = null;
    _sharedElementTransition: SharedTransition | null = null;
    _jsPropsUpdater = new JSPropsUpdater();
    _InlinePropManager = new InlinePropManager();
    _PropsFilter = new PropsFilter();
    _NativeEventsManager?: INativeEventsManager;
    _viewInfo?: ViewInfo;
    static displayName: string;
    static contextType = SkipEnteringContext;
    context!: React.ContextType<typeof SkipEnteringContext>;
    reanimatedID = id++;
    _willUnmount: boolean = false;

    constructor(props: AnimatedComponentProps<InitialComponentProps>) {
      super(props);

      if (IS_JEST) {
        this.jestAnimatedStyle = { value: {} };
        this.jestAnimatedProps = { value: {} };
      }

      this.state = { settledProps: {}, reanimatedProps: {} };

      const skipEntering = this.context?.current;
      if (isFabric() && !skipEntering) {
        this._configureLayoutAnimation(
          LayoutAnimationType.ENTERING,
          this.props.entering
        );
      }
    }

    componentDidMount() {
      if (!IS_WEB) {
        // It exists only on native platforms. We initialize it here because the ref to the animated component is available only post-mount
        this._NativeEventsManager = new NativeEventsManager(this, options);
      }
      this._NativeEventsManager?.attachEvents();
      this._jsPropsUpdater.addOnJSPropsChangeListener(this);
      this._attachAnimatedStyles();
      this._InlinePropManager.attachInlineProps(this, this._getViewInfo());

      const viewTag = this.getComponentViewTag();

      if (isFabric() && viewTag !== -1) {
        PropsRegistryGarbageCollector.registerView(viewTag, this);
      }

      if (viewTag !== -1) {
        ComponentRegistry.register(viewTag, this);
      }

      this._configureLayoutAnimation(
        LayoutAnimationType.LAYOUT,
        this.props.layout
      );
      this._configureLayoutAnimation(
        LayoutAnimationType.EXITING,
        this.props.exiting
      );

      if (IS_WEB && this._componentDOMRef) {
        const element = this._componentDOMRef as ReanimatedHTMLElement;
        const dummyClone = element.dummyClone;
        // If the element was cloned (because of the exiting animation), we need bring it
        // back to the DOM
        while (dummyClone?.firstChild) {
          element.appendChild(dummyClone.firstChild);
        }
        delete element.dummyClone;

        if (this.props.exiting) {
          saveSnapshot(element);
        }

        if (!this.props.entering) {
          this._isFirstRender = false;
          return;
        }

        if (getReducedMotionFromConfig(this.props.entering as CustomConfig)) {
          this._isFirstRender = false;
          (this.props.entering as BaseAnimationBuilder).callbackV?.(true);
          return;
        }

        const skipEntering = this.context?.current;

        if (!skipEntering) {
          startWebLayoutAnimation(
            this.props,
            element,
            LayoutAnimationType.ENTERING
          );
        } else if (element.style) {
          element.style.visibility = 'initial';
        }
      }

      if (
        !SHOULD_BE_USE_WEB &&
        isFabric() &&
        this._willUnmount &&
        typeof viewTag === 'number'
      ) {
        // Component was frozen and is now remounting - cancel pending cleanup
        this._willUnmount = false;
        unmarkNodeAsRemovable(viewTag);
      }

      this._isFirstRender = false;
    }

    componentWillUnmount() {
      this._NativeEventsManager?.detachEvents();
      this._jsPropsUpdater.removeOnJSPropsChangeListener(this);

      const viewTag = this.getComponentViewTag();
      if (isFabric() && viewTag !== -1) {
        PropsRegistryGarbageCollector.unregisterView(viewTag);
      }

      // Defer cleanup for Fabric (freeze detection via callback), immediate for Paper/Web
      if (!SHOULD_BE_USE_WEB && isFabric()) {
        // Mark as unmounting - callback will determine if frozen or truly unmounted
        this._willUnmount = true;
      } else {
        // Paper/Web: Can't distinguish freeze from unmount, clean up immediately
        this._detachStyles();
      }

      this._InlinePropManager.detachInlineProps();
      if (this.props.sharedTransitionTag) {
        this._configureSharedTransition(true);
      }
      this._sharedElementTransition?.unregisterTransition(
        this.getComponentViewTag(),
        true
      );

      const exiting = this.props.exiting;

      // Unregister from ComponentRegistry (Paper only - Fabric handled in callback)
      if (!SHOULD_BE_USE_WEB && !isFabric() && viewTag !== -1) {
        ComponentRegistry.unregister(viewTag);
      }

      if (IS_WEB && this._componentDOMRef && exiting) {
        if (getReducedMotionFromConfig(exiting as CustomConfig)) {
          (exiting as BaseAnimationBuilder).callbackV?.(true);
          return;
        }
        addHTMLMutationObserver();

        startWebLayoutAnimation(
          this.props,
          this._componentDOMRef as ReanimatedHTMLElement,
          LayoutAnimationType.EXITING
        );
      } else if (exiting && !IS_WEB && !isFabric()) {
        const reduceMotionInExiting =
          'getReduceMotion' in exiting &&
          typeof exiting.getReduceMotion === 'function'
            ? getReduceMotionFromConfig(exiting.getReduceMotion())
            : getReduceMotionFromConfig();
        if (!reduceMotionInExiting) {
          this._configureLayoutAnimation(LayoutAnimationType.EXITING, exiting);
        }
      }

      const wrapper = this._viewInfo?.shadowNodeWrapper;
      if (!SHOULD_BE_USE_WEB && isFabric() && wrapper) {
        // Mark node as removable on the native (C++) side, but only actually remove it
        // when it no longer exists in the Shadow Tree. This ensures proper cleanup of
        // animations/transitions/props while handling cases where the node might be
        // remounted (e.g., when frozen) after componentWillUnmount is called.
        markNodeAsRemovable(wrapper);
      }
    }

    _syncStylePropsBackToReact(props: StyleProps) {
      this.setState({ settledProps: props });
    }

    getComponentViewTag() {
      return this._getViewInfo().viewTag as number;
    }

    _detachStyles() {
      const viewTag = this.getComponentViewTag();
      if (viewTag !== -1 && this._styles !== null) {
        for (const style of this._styles) {
          style.viewDescriptors.remove(viewTag);
        }
        if (this.props.animatedProps?.viewDescriptors) {
          this.props.animatedProps.viewDescriptors.remove(viewTag);
        }
      }
    }

    _updateFromNative(props: StyleProps) {
      if (options?.setNativeProps) {
        options.setNativeProps(
          this._componentRef as AnimatedComponentRef,
          props
        );
      } else {
        (this._componentRef as AnimatedComponentRef)?.setNativeProps?.(props);
      }
    }

    /**
     * Mechanism to update this component's props from native.Add commentMore
     * actions (As reanimated is changing the props only on the UI thread at
     * some point we want to sync with the JS thread). Reanimated props can be
     * animatedProps but also animated styles. Note that styles are flattened
     * and passed as top level props.
     */
    _updateReanimatedProps(props: { [key: string]: unknown }) {
      if (options?.disableReactSync) {
        return;
      }

      const transformedProps: { [key: string]: unknown } = {};
      for (const prop in props) {
        let value = props[prop];
        if (
          (prop === 'color' || prop.endsWith('Color')) &&
          value &&
          typeof value === 'string'
        ) {
          value = processColor(value);
        } else if (
          prop === 'top' ||
          prop === 'bottom' ||
          prop.startsWith('margin') ||
          prop.startsWith('padding')
        ) {
          // if all reanimated props cannot be updated, there is no point in syncing them
          return;
        }
        transformedProps[prop] = value;
      }
      this.setState((prevState) => ({
        reanimatedProps: {
          // its important to preserve previous state. When multiple style props are animated they might not all appear in one update.
          ...prevState.reanimatedProps,
          ...transformedProps,
        },
      }));
    }

    _getViewInfo(): ViewInfo {
      if (this._viewInfo !== undefined) {
        return this._viewInfo;
      }

      let viewTag: number | typeof this._componentRef;
      let viewName: string | null;
      let shadowNodeWrapper: ShadowNodeWrapper | null = null;
      let viewConfig;
      let DOMElement: HTMLElement | null = null;

      if (SHOULD_BE_USE_WEB) {
        // At this point I assume that `_setComponentRef` was already called and `_component` is set.
        // `this._component` on web represents HTMLElement of our component, that's why we use casting
        viewTag = this._componentRef;
        DOMElement = this._componentDOMRef;
        viewName = null;
        shadowNodeWrapper = null;
        viewConfig = null;
      } else {
        const hostInstance = findHostInstance(this);
        if (!hostInstance) {
          /*
            findHostInstance can return null for a component that doesn't render anything
            (render function returns null). Example:
            svg Stop: https://github.com/react-native-svg/react-native-svg/blob/develop/src/elements/Stop.tsx
          */
          throw new ReanimatedError(
            'Cannot find host instance for this component. Maybe it renders nothing?'
          );
        }

        const viewInfo = getViewInfo(hostInstance);
        viewTag = viewInfo.viewTag;
        viewName = viewInfo.viewName;
        viewConfig = viewInfo.viewConfig;
        shadowNodeWrapper = isFabric()
          ? getShadowNodeWrapperFromRef(this, hostInstance)
          : null;
      }
      this._viewInfo = { viewTag, viewName, shadowNodeWrapper, viewConfig };
      if (DOMElement) {
        this._viewInfo.DOMElement = DOMElement;
      }
      return this._viewInfo;
    }

    _attachAnimatedStyles() {
      const styles = this.props.style
        ? onlyAnimatedStyles(flattenArray<StyleProps>(this.props.style))
        : [];
      const animatedProps = this.props.animatedProps;
      const prevStyles = this._styles;
      this._styles = styles;

      const prevAnimatedProps = this._animatedProps;
      this._animatedProps = animatedProps;

      const { viewTag, viewName, shadowNodeWrapper, viewConfig } =
        this._getViewInfo();

      // update UI props whitelist for this view
      const hasReanimated2Props =
        this.props.animatedProps?.viewDescriptors || styles.length;
      if (hasReanimated2Props && viewConfig) {
        adaptViewConfig(viewConfig);
      }

      const newStyles = new Set<StyleProps>(styles);

      const isStyleAttached = (style: StyleProps) =>
        style.viewDescriptors.has(viewTag);

      // remove old styles
      if (prevStyles) {
        // in most of the cases, views have only a single animated style and it remains unchanged
        const hasOneSameStyle =
          styles.length === 1 &&
          prevStyles.length === 1 &&
          styles[0] === prevStyles[0];

        if (hasOneSameStyle && isStyleAttached(prevStyles[0])) {
          return;
        }

        // otherwise, remove each style that is not present in new styles
        for (const prevStyle of prevStyles) {
          const isPresent = styles.some((style) => {
            if (style === prevStyle && isStyleAttached(style)) {
              // Skip already attached styles
              return true;
            }
            return false;
          });
          if (!isPresent) {
            prevStyle.viewDescriptors.remove(viewTag);
          }
        }
      }

      if (animatedProps && IS_JEST) {
        this.jestAnimatedProps.value = {
          ...this.jestAnimatedProps.value,
          ...animatedProps?.initial?.value,
        };

        if (animatedProps?.jestAnimatedValues) {
          animatedProps.jestAnimatedValues.current = this.jestAnimatedProps;
        }
      }

      newStyles.forEach((style) => {
        style.viewDescriptors.add({
          tag: viewTag,
          name: viewName,
          shadowNodeWrapper,
        });
        if (IS_JEST) {
          /**
           * We need to connect Jest's TestObject instance whose contains just
           * props object with the updateProps() function where we update the
           * properties of the component. We can't update props object directly
           * because TestObject contains a copy of props - look at render
           * function: const props = this._filterNonAnimatedProps(this.props);
           */
          this.jestAnimatedStyle.value = {
            ...this.jestAnimatedStyle.value,
            ...style.initial.value,
          };
          style.jestAnimatedValues.current = this.jestAnimatedStyle;
        }
      });

      // detach old animatedProps
      if (prevAnimatedProps && prevAnimatedProps !== this.props.animatedProps) {
        prevAnimatedProps.viewDescriptors!.remove(viewTag as number);
      }

      // attach animatedProps property
      if (this.props.animatedProps?.viewDescriptors) {
        this.props.animatedProps.viewDescriptors.add({
          tag: viewTag as number,
          name: viewName!,
          shadowNodeWrapper: shadowNodeWrapper!,
        });
      }
    }

    componentDidUpdate(
      prevProps: AnimatedComponentProps<InitialComponentProps>,
      _prevState: Readonly<unknown>,
      snapshot: DOMRect | null
    ) {
      this._configureLayoutAnimation(
        LayoutAnimationType.LAYOUT,
        this.props.layout,
        prevProps.layout
      );
      this._configureLayoutAnimation(
        LayoutAnimationType.EXITING,
        this.props.exiting,
        prevProps.exiting
      );

      if (
        this.props.sharedTransitionTag !== undefined ||
        prevProps.sharedTransitionTag !== undefined
      ) {
        this._configureSharedTransition();
      }
      this._NativeEventsManager?.updateEvents(prevProps);
      this._attachAnimatedStyles();
      this._InlinePropManager.attachInlineProps(this, this._getViewInfo());

      if (IS_WEB && this.props.exiting && this._componentDOMRef) {
        saveSnapshot(this._componentDOMRef);
      }

      if (IS_WEB && snapshot && this.props.layout) {
        if (getReducedMotionFromConfig(this.props.layout as CustomConfig)) {
          (this.props.layout as BaseAnimationBuilder).callbackV?.(true);

          return;
        }
        tryActivateLayoutTransition(
          this.props,
          this._componentDOMRef as ReanimatedHTMLElement,
          snapshot
        );
      }
    }

    _configureLayoutAnimation(
      type: LayoutAnimationType,
      currentConfig: LayoutAnimationOrBuilder | undefined,
      previousConfig?: LayoutAnimationOrBuilder
    ) {
      if (IS_WEB || currentConfig === previousConfig) {
        return;
      }

      if (this._isReducedMotion(currentConfig)) {
        if (!previousConfig) {
          return;
        }
        currentConfig = undefined;
      }

      updateLayoutAnimations(
        isFabric() && type === LayoutAnimationType.ENTERING
          ? this.reanimatedID
          : this.getComponentViewTag(),
        type,
        currentConfig &&
          maybeBuild(
            currentConfig,
            type === LayoutAnimationType.LAYOUT
              ? undefined /* We don't have to warn user if style has common properties with animation for LAYOUT */
              : this.props?.style,
            AnimatedComponent.displayName
          )
      );
    }

    _configureSharedTransition(isUnmounting = false) {
      if (IS_WEB) {
        return;
      }

      const { sharedTransitionTag } = this.props;
      if (!sharedTransitionTag) {
        this._sharedElementTransition?.unregisterTransition(
          this.getComponentViewTag(),
          isUnmounting
        );
        this._sharedElementTransition = null;
        return;
      }
      const sharedElementTransition =
        this.props.sharedTransitionStyle ??
        this._sharedElementTransition ??
        new SharedTransition();
      sharedElementTransition.registerTransition(
        this.getComponentViewTag(),
        sharedTransitionTag,
        isUnmounting
      );
      this._sharedElementTransition = sharedElementTransition;
    }

    _resolveComponentRef = (ref: Component | HTMLElement | null) => {
      const componentRef = ref as AnimatedComponentRef;
      // Component can specify ref which should be animated when animated version of the component is created.
      // Otherwise, we animate the component itself.
      if (componentRef && componentRef.getAnimatableRef) {
        this._hasAnimatedRef = true;
        return componentRef.getAnimatableRef();
      }
      // Case for SVG components on Web
      if (SHOULD_BE_USE_WEB) {
        if (componentRef && componentRef.elementRef) {
          this._componentDOMRef = componentRef.elementRef.current;
        } else {
          this._componentDOMRef = ref as HTMLElement;
        }
      }
      return componentRef;
    };

    _setComponentRef = setAndForwardRef<Component | HTMLElement>({
      getForwardedRef: () =>
        this.props.forwardedRef as RefObject<
          Component<Record<string, unknown>, Record<string, unknown>, unknown>
        >,
      setLocalRef: (ref) => {
        if (!ref) {
          // component has been unmounted
          return;
        }
        if (ref !== this._componentRef) {
          this._componentRef = this._resolveComponentRef(ref);
          // if ref is changed, reset viewInfo
          this._viewInfo = undefined;
        }

        const { layout, entering, exiting, sharedTransitionTag } = this.props;
        if (layout || entering || exiting || sharedTransitionTag) {
          if (!SHOULD_BE_USE_WEB) {
            enableLayoutAnimations(true, false);
          }

          if (sharedTransitionTag) {
            this._configureSharedTransition();
          }

          const skipEntering = this.context?.current;
          if (entering && !isFabric() && !skipEntering && !IS_WEB) {
            this._configureLayoutAnimation(
              LayoutAnimationType.ENTERING,
              this.props.entering
            );
          }
        }
      },
    });

    _isReducedMotion(config?: LayoutAnimationOrBuilder): boolean {
      return config &&
        'getReduceMotion' in config &&
        typeof config.getReduceMotion === 'function'
        ? getReduceMotionFromConfig(config.getReduceMotion())
        : getReduceMotionFromConfig();
    }

    // This is a component lifecycle method from React, therefore we are not calling it directly.
    // It is called before the component gets rerendered. This way we can access components' position before it changed
    // and later on, in componentDidUpdate, calculate translation for layout transition.
    getSnapshotBeforeUpdate() {
      if (
        IS_WEB &&
        this.props.layout &&
        this._componentDOMRef?.getBoundingClientRect
      ) {
        return this._componentDOMRef.getBoundingClientRect();
      }

      // `getSnapshotBeforeUpdate` has to return value which is not `undefined`.
      return null;
    }

    render() {
      const filteredProps = this._PropsFilter.filterNonAnimatedProps(this);
      if (IS_JEST) {
        filteredProps.jestAnimatedStyle = this.jestAnimatedStyle;
        filteredProps.jestAnimatedProps = this.jestAnimatedProps;
      }

      // Layout animations on web are set inside `componentDidMount` method, which is called after first render.
      // Because of that we can encounter a situation in which component is visible for a short amount of time, and later on animation triggers.
      // I've tested that on various browsers and devices and it did not happen to me. To be sure that it won't happen to someone else,
      // I've decided to hide component at first render. Its visibility is reset in `componentDidMount`.
      if (
        this._isFirstRender &&
        IS_WEB &&
        filteredProps.entering &&
        !getReducedMotionFromConfig(filteredProps.entering as CustomConfig)
      ) {
        filteredProps.style = Array.isArray(filteredProps.style)
          ? filteredProps.style.concat([{ visibility: 'hidden' }])
          : {
              ...(filteredProps.style ?? {}),
              visibility: 'hidden', // Hide component until `componentDidMount` triggers
            };
      }

      const platformProps = Platform.select({
        web: {},
        default: { collapsable: false },
      });

      const skipEntering = this.context?.current;
      const nativeID =
        skipEntering || !isFabric() ? undefined : `${this.reanimatedID}`;

      const jestProps = IS_JEST
        ? {
            jestInlineStyle:
              this.props.style && filterOutAnimatedStyles(this.props.style),
            jestAnimatedStyle: this.jestAnimatedStyle,
            jestAnimatedProps: this.jestAnimatedProps,
          }
        : {};

      if (isFabric()) {
        const flatStyles = StyleSheet.flatten(filteredProps.style as object);
        const mergedStyles = {
          ...flatStyles,
          ...this.state.settledProps,
        };

        return (
          <Component
            nativeID={nativeID}
            {...filteredProps}
            {...jestProps}
            style={mergedStyles}
            {...this.state.settledProps}
            {...this.state.reanimatedProps}
            // Casting is used here, because ref can be null - in that case it cannot be assigned to HTMLElement.
            // After spending some time trying to figure out what to do with this problem, we decided to leave it this way
            ref={this._setComponentRef as (ref: Component) => void}
            {...platformProps}
          />
        );
      }

      return (
        <Component
          nativeID={nativeID}
          {...filteredProps}
          {...jestProps}
          {...this.state.reanimatedProps}
          // Casting is used here, because ref can be null - in that case it cannot be assigned to HTMLElement.
          // After spending some time trying to figure out what to do with this problem, we decided to leave it this way
          ref={this._setComponentRef as (ref: Component) => void}
          {...platformProps}
        />
      );
    }
  }

  AnimatedComponent.displayName = `AnimatedComponent(${
    Component.displayName || Component.name || 'Component'
  })`;

  const animatedComponent = componentWithRef(
    (
      props: PropsWithoutRef<AnimatedComponentProps<InitialComponentProps>>,
      ref: Ref<Component>
    ) => (
      <AnimatedComponent
        {...props}
        {...(ref === null ? null : { forwardedRef: ref })}
      />
    )
  );

  animatedComponent.displayName =
    Component.displayName || Component.name || 'Component';

  // Cast to AnimatedComponentType to enable generic animatedProps inference.
  // The runtime behavior is correct; this cast just helps TypeScript understand
  // that props provided via animatedProps should be optional on the component.
  return animatedComponent as unknown as AnimatedComponentType<InitialComponentProps>;
}

function filterOutAnimatedStyles(
  style: NestedArray<StyleProps | AnimatedStyleHandle | null | undefined>
): NestedArray<StyleProps | null | undefined> {
  if (!style) {
    return style;
  }
  if (!Array.isArray(style)) {
    return style?.viewDescriptors ? {} : style;
  }
  return style
    .filter(
      (styleElement) => !(styleElement && 'viewDescriptors' in styleElement)
    )
    .map((styleElement) => {
      if (Array.isArray(styleElement)) {
        return filterOutAnimatedStyles(styleElement);
      }
      return styleElement;
    });
}
