/* eslint-disable @typescript-eslint/no-redundant-type-constituents, @typescript-eslint/no-explicit-any */
'use strict';

import { processColorsInProps } from "../Colors.js";
import { ReanimatedError } from "../errors.js";
import { isFabric, isJest, shouldBeUseWeb } from "../PlatformChecker.js";
import { _updatePropsJS } from "../ReanimatedModule/js-reanimated/index.js";
import { runOnJS, runOnUIImmediately } from "../threads.js";
import { processTransformOrigin } from "./processTransformOrigin.js";
import { ComponentRegistry } from "./ComponentRegistry.js";
let updateProps;
if (shouldBeUseWeb()) {
  updateProps = (viewDescriptors, updates, isAnimatedProps) => {
    'worklet';

    viewDescriptors.value?.forEach(viewDescriptor => {
      const component = viewDescriptor.tag;
      _updatePropsJS(updates, component, isAnimatedProps);
    });
  };
} else {
  updateProps = (viewDescriptors, updates) => {
    'worklet';

    // Important: store the updates before running processing on them
    // the goal is to use these updates later on react JS to set these as style state to the components.
    // processing is alternating the style props as RN expects them.
    viewDescriptors.value.forEach(viewDescriptor => {
      const prevState = global.lastUpdateByTag[viewDescriptor.tag] ?? {};
      global.lastUpdateByTag[viewDescriptor.tag] = {
        ...prevState,
        // its important to preserve previous state. When multiple style props are animated they might not all appear in one update.
        ...updates // copy updates as process mutates inline
      };
      global.lastUpdateFrameTimeByTag[viewDescriptor.tag] = global.__frameTimestamp;
    });
    processColorsInProps(updates);
    if ('transformOrigin' in updates) {
      updates.transformOrigin = processTransformOrigin(updates.transformOrigin);
    }
    global.UpdatePropsManager.update(viewDescriptors, updates);
  };
}
export const updatePropsJestWrapper = (viewDescriptors, updates, animatedValues, adapters) => {
  adapters.forEach(adapter => {
    adapter(updates);
  });
  animatedValues.current.value = {
    ...animatedValues.current.value,
    ...updates
  };
  updateProps(viewDescriptors, updates);
};
export default updateProps;

// Apply thr changes from UI thread to JS thread.Add commentMore actions
function updatePropsOnReactJS(tag, props) {
  const component = ComponentRegistry.getComponent(tag);
  if (component) {
    component._updateReanimatedProps(props);
  }
}
const createUpdatePropsManager = isFabric() ? () => {
  'worklet';

  // Fabric
  const operations = [];
  const scheduledFrameIds = {};

  // Function that will update the props to the react component on the JS thread after a component has settled its animation.
  function checkUpdate(tag) {
    'worklet';

    const currentFrameTime = global.__frameTimestamp;
    const lastUpdateFrameTime = global.lastUpdateFrameTimeByTag[tag];
    if (!currentFrameTime || !lastUpdateFrameTime) {
      return;
    }
    if (currentFrameTime - lastUpdateFrameTime >= 20) {
      // ~ 2x frames
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
    update(viewDescriptors, updates) {
      viewDescriptors.value.forEach(viewDescriptor => {
        const tag = viewDescriptor.tag; // on mobile it should be a number
        operations.push({
          shadowNodeWrapper: viewDescriptor.shadowNodeWrapper,
          updates,
          tag
        });
        if (operations.length === 1) {
          queueMicrotask(this.flush);
        }
      });
    },
    flush() {
      global._updatePropsFabric(operations);
      operations.forEach(({
        tag
      }) => {
        checkUpdate(tag);
      });
      operations.length = 0;
    }
  };
} : () => {
  'worklet';

  // Paper
  const operations = [];
  return {
    update(viewDescriptors, updates) {
      viewDescriptors.value.forEach(viewDescriptor => {
        operations.push({
          tag: viewDescriptor.tag,
          name: viewDescriptor.name || 'RCTView',
          updates
        });
        if (operations.length === 1) {
          queueMicrotask(this.flush);
        }
      });
    },
    flush() {
      global._updatePropsPaper(operations);
      operations.length = 0;
    }
  };
};
if (shouldBeUseWeb()) {
  const maybeThrowError = () => {
    // Jest attempts to access a property of this object to check if it is a Jest mock
    // so we can't throw an error in the getter.
    if (!isJest()) {
      throw new ReanimatedError('`UpdatePropsManager` is not available on non-native platform.');
    }
  };
  global.UpdatePropsManager = new Proxy({}, {
    get: maybeThrowError,
    set: () => {
      maybeThrowError();
      return false;
    }
  });
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
//# sourceMappingURL=updateProps.js.map