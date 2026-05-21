package com.facebook.react.uimanager.layoutanimation;

import android.view.View;

/**
 * RN 0.85 COMPAT [NOT APPLICABLE]: The entire
 * com.facebook.react.uimanager.layoutanimation package was removed in RN >= 0.83.
 * This stub allows ReaLayoutAnimator (paper-arch code) to compile in new-arch
 * builds where it is never executed at runtime.
 * In upstream reanimated 4, ReaLayoutAnimator does not exist — layout animations
 * are handled entirely through Fabric's MountingOverrideDelegate (C++ layer).
 */
public class LayoutAnimationController {
  public boolean shouldAnimateLayout(View viewToAnimate) {
    return false;
  }

  public void reset() {}

  public void applyLayoutUpdate(View view, int x, int y, int width, int height) {}

  public void onAnimationFinished(LayoutAnimationListener listener) {}

  public boolean hasLayoutAnimation() {
    return false;
  }

  public void setLayoutAnimationDestroyListener(LayoutAnimationListener listener) {}

  public void deleteView(android.view.View view, LayoutAnimationListener listener) {
    listener.onAnimationEnd();
  }
}
