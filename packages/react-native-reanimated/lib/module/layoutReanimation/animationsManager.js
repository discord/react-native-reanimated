"use strict";

import { isAndroid } from "react-native-reanimated/src/PlatformChecker";
import { withStyleAnimation } from "../animation/styleAnimation.js";
import { LayoutAnimationType } from "../commonTypes.js";
import { makeMutableUI } from "../mutables.js";
import { runOnUIImmediately } from "../threads.js";
const TAG_OFFSET = 1e9;
const IS_ANDROID = isAndroid();
function startObservingProgress(tag, sharedValue, animationType) {
  "worklet";

  const isSharedTransition = animationType === LayoutAnimationType.SHARED_ELEMENT_TRANSITION;
  sharedValue.addListener(tag + TAG_OFFSET, () => {
    global._notifyAboutProgress(tag, sharedValue.value, isSharedTransition);
  });
}
function stopObservingProgress(tag, sharedValue, removeView = false) {
  "worklet";

  sharedValue.removeListener(tag + TAG_OFFSET);
  global._notifyAboutEnd(tag, removeView);
}
function createLayoutAnimationManager() {
  "worklet";

  const currentAnimationForTag = new Map();
  const mutableValuesForTag = new Map();
  const startActually = (tag, type, yogaValues, config) => {
    if (type === LayoutAnimationType.SHARED_ELEMENT_TRANSITION_PROGRESS) {
      global.ProgressTransitionRegister.onTransitionStart(tag, yogaValues);
      return;
    }
    const style = config(yogaValues);
    let currentAnimation = style.animations;

    // When layout animation is requested, but a previous one is still running, we merge
    // new layout animation targets into the ongoing animation
    const previousAnimation = currentAnimationForTag.get(tag);
    if (previousAnimation) {
      currentAnimation = {
        ...previousAnimation,
        ...style.animations
      };
    }
    currentAnimationForTag.set(tag, currentAnimation);
    let value = mutableValuesForTag.get(tag);
    if (value === undefined) {
      value = makeMutableUI(style.initialValues);
      mutableValuesForTag.set(tag, value);
    } else {
      stopObservingProgress(tag, value);
      value._value = style.initialValues;
    }

    // @ts-ignore The line below started failing because I added types to the method – don't have time to fix it right now
    const animation = withStyleAnimation(currentAnimation);
    animation.callback = finished => {
      if (finished) {
        currentAnimationForTag.delete(tag);
        mutableValuesForTag.delete(tag);
        const shouldRemoveView = type === LayoutAnimationType.EXITING;
        stopObservingProgress(tag, value, shouldRemoveView);
      }
      style.callback && style.callback(finished === undefined ? false : finished);
    };
    startObservingProgress(tag, value, type);
    value.value = animation;
  };
  let start;
  if (IS_ANDROID) {
    // @ts-expect-error TODO: FIX ME
    start = (tag, type, yogaValues, config) => requestAnimationFrame(() => {
      startActually(tag, type, yogaValues, config);
    });
  } else {
    start = startActually;
  }
  return {
    start,
    stop(tag) {
      const value = mutableValuesForTag.get(tag);
      if (!value) {
        return;
      }
      stopObservingProgress(tag, value);
    }
  };
}
runOnUIImmediately(() => {
  "worklet";

  global.LayoutAnimationsManager = createLayoutAnimationManager();
})();
//# sourceMappingURL=animationsManager.js.map