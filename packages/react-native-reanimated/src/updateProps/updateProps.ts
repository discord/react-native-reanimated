/* eslint-disable @typescript-eslint/no-redundant-type-constituents, @typescript-eslint/no-explicit-any */
'use strict';

import type { MutableRefObject } from 'react';

import { processColorsInProps } from '../Colors';
import type {
  AnimatedStyle,
  ShadowNodeWrapper,
  StyleProps,
} from '../commonTypes';
import { ReanimatedError } from '../errors';
import type { Descriptor } from '../hook/commonTypes';
import { isFabric, isJest, shouldBeUseWeb } from '../PlatformChecker';
import type { ReanimatedHTMLElement } from '../ReanimatedModule/js-reanimated';
import { _updatePropsJS } from '../ReanimatedModule/js-reanimated';
import { runOnJS, runOnUIImmediately } from '../threads';
import { processTransformOrigin } from './processTransformOrigin';
import { ComponentRegistry } from './ComponentRegistry';

let updateProps: (
  viewDescriptors: ViewDescriptorsWrapper,
  updates: StyleProps | AnimatedStyle<any>,
  isAnimatedProps?: boolean
) => void;

if (shouldBeUseWeb()) {
  updateProps = (viewDescriptors, updates, isAnimatedProps) => {
    'worklet';
    viewDescriptors.value?.forEach((viewDescriptor) => {
      const component = viewDescriptor.tag as ReanimatedHTMLElement;
      _updatePropsJS(updates, component, isAnimatedProps);
    });
  };
} else {
  updateProps = (viewDescriptors, updates) => {
    'worklet';

    // Important: store the updates before running processing on them
    // the goal is to use these updates later on react JS to set these as style state to the components.
    // processing is alternating the style props as RN expects them.
    viewDescriptors.value.forEach((viewDescriptor) => {
      const prevState = global.lastUpdateByTag[viewDescriptor.tag as number] ?? {};
      global.lastUpdateByTag[viewDescriptor.tag as number] = {
        ...prevState, // its important to preserve previous state. When multiple style props are animated they might not all appear in one update.
        ...updates // copy updates as process mutates inline
      };
      global.lastUpdateFrameTimeByTag[viewDescriptor.tag as number] = global.__frameTimestamp;
    });

    processColorsInProps(updates);
    if ('transformOrigin' in updates) {
      updates.transformOrigin = processTransformOrigin(updates.transformOrigin);
    }
    global.UpdatePropsManager.update(viewDescriptors, updates);
  };
}

export const updatePropsJestWrapper = (
  viewDescriptors: ViewDescriptorsWrapper,
  updates: AnimatedStyle<any>,
  animatedValues: MutableRefObject<AnimatedStyle<any>>,
  adapters: ((updates: AnimatedStyle<any>) => void)[]
): void => {
  adapters.forEach((adapter) => {
    adapter(updates);
  });
  animatedValues.current.value = {
    ...animatedValues.current.value,
    ...updates,
  };

  updateProps(viewDescriptors, updates);
};

export default updateProps;

// Apply thr changes from UI thread to JS thread.Add commentMore actions
function updatePropsOnReactJS(tag: number, props: StyleProps) {
  const component = ComponentRegistry.getComponent(tag);
  if (component) {
    component._updateReanimatedProps(props);
  }
}


const createUpdatePropsManager = isFabric()
  ? () => {
      'worklet';
      // Fabric
      const operations: {
        shadowNodeWrapper: ShadowNodeWrapper;
        updates: StyleProps | AnimatedStyle<any>;
        tag: number;
      }[] = [];

      const scheduledFrameIds: Record<number, number | undefined> = {};

      // Function that will update the props to the react component on the JS thread after a component has settled its animation.
      function checkUpdate(tag: number) {
        'worklet';

        const currentFrameTime = global.__frameTimestamp;
        const lastUpdateFrameTime = global.lastUpdateFrameTimeByTag[tag];
        if (!currentFrameTime || !lastUpdateFrameTime) {
          return;
        }

        if (currentFrameTime - lastUpdateFrameTime >= 20) { // ~ 2x frames
          // Animation appears to have settled - update component props on JS
          runOnJS(updatePropsOnReactJS)(tag, global.lastUpdateByTag[tag]);
          global.lastUpdateByTag[tag] = undefined;
          return;
        }

        if (scheduledFrameIds[tag]) {
          // Note: REA/Worklets doesn't support cancelAnimationFrame
          return;
        }

        scheduledFrameIds[tag] = requestAnimationFrame(() => {
          'worklet';
          scheduledFrameIds[tag] = undefined;
          checkUpdate(tag);
        });
      }

      return {
        update(
          viewDescriptors: ViewDescriptorsWrapper,
          updates: StyleProps | AnimatedStyle<any>
        ) {
          viewDescriptors.value.forEach((viewDescriptor) => {
            const tag = viewDescriptor.tag as number; // on mobile it should be a number
            operations.push({
              shadowNodeWrapper: viewDescriptor.shadowNodeWrapper,
              updates,
              tag,
            });
            if (operations.length === 1) {
              queueMicrotask(this.flush);
            }
          });
        },
        flush(this: void) {
          global._updatePropsFabric!(operations);
          operations.forEach(({ tag }) => {
            checkUpdate(tag);
          });
          operations.length = 0;
        },
      };
    }
  : () => {
      'worklet';
      // Paper
      const operations: {
        tag: number;
        name: string;
        updates: StyleProps | AnimatedStyle<any>;
      }[] = [];
      return {
        update(
          viewDescriptors: ViewDescriptorsWrapper,
          updates: StyleProps | AnimatedStyle<any>
        ) {
          viewDescriptors.value.forEach((viewDescriptor) => {
            operations.push({
              tag: viewDescriptor.tag as number,
              name: viewDescriptor.name || 'RCTView',
              updates,
            });
            if (operations.length === 1) {
              queueMicrotask(this.flush);
            }
          });
        },
        flush(this: void) {
          global._updatePropsPaper!(operations);
          operations.length = 0;
        },
      };
    };

if (shouldBeUseWeb()) {
  const maybeThrowError = () => {
    // Jest attempts to access a property of this object to check if it is a Jest mock
    // so we can't throw an error in the getter.
    if (!isJest()) {
      throw new ReanimatedError(
        '`UpdatePropsManager` is not available on non-native platform.'
      );
    }
  };
  global.UpdatePropsManager = new Proxy(
    {},
    {
      get: maybeThrowError,
      set: () => {
        maybeThrowError();
        return false;
      },
    }
  );
} else {
  runOnUIImmediately(() => {
    'worklet';
    global.UpdatePropsManager = createUpdatePropsManager();
  })();
}

/**
 * This used to be `SharedValue<Descriptors[]>` but objects holding just a
 * single `value` prop are fine too.
 */
interface ViewDescriptorsWrapper {
  value: Readonly<Descriptor[]>;
}
