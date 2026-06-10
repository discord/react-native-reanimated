package com.swmansion.reanimated;

import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.view.ViewTreeObserver;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.UiThreadUtil;

/**
 * Tracks whether the current UI thread turn is inside a draw pass.
 *
 * RN 0.85 COMPAT [DIFFERENT APPROACH -> EQUIVALENT]: Port of the upstream
 * reanimated 4 DrawPassDetector.kt (packages/react-native-reanimated/android).
 * This replaces the removed Event.isDrawing() API with a ViewTreeObserver-based
 * draw-pass detector that accurately tracks whether we are currently inside a
 * draw pass. The upstream Kotlin original is functionally identical to this Java port.
 */
public class DrawPassDetector {
  private final ReactApplicationContext mContext;
  private final Handler mHandler = new Handler(Looper.getMainLooper());
  private final Runnable mClearRunnable = () -> mIsInDrawPass = false;
  private boolean mIsInDrawPass = false;
  private View mDecorView = null;

  private final ViewTreeObserver.OnDrawListener mOnDrawListener =
      () -> {
        mIsInDrawPass = true;
        mHandler.postAtFrontOfQueue(mClearRunnable);
      };

  public DrawPassDetector(ReactApplicationContext context) {
    mContext = context;
  }

  public void initialize() {
    android.app.Activity activity = mContext.getCurrentActivity();
    if (activity == null) {
      return;
    }

    View decorView = activity.getWindow().getDecorView();
    if (decorView == mDecorView) {
      return;
    }

    // Decor view changed (e.g. Activity recreated) — detach from the old one first.
    if (mDecorView != null) {
      ViewTreeObserver oldObserver = mDecorView.getViewTreeObserver();
      if (oldObserver.isAlive()) {
        oldObserver.removeOnDrawListener(mOnDrawListener);
      }
      mDecorView = null;
    }

    ViewTreeObserver observer = decorView.getViewTreeObserver();
    if (!observer.isAlive()) {
      return;
    }

    mDecorView = decorView;
    observer.addOnDrawListener(mOnDrawListener);
  }

  public boolean isInDrawPass() {
    return mIsInDrawPass;
  }

  public void invalidate() {
    if (UiThreadUtil.isOnUiThread()) {
      invalidateOnUiThread();
    } else {
      mHandler.post(this::invalidateOnUiThread);
    }
  }

  private void invalidateOnUiThread() {
    if (mDecorView != null) {
      ViewTreeObserver observer = mDecorView.getViewTreeObserver();
      if (observer.isAlive()) {
        observer.removeOnDrawListener(mOnDrawListener);
      }
      mDecorView = null;
    }
    mHandler.removeCallbacks(mClearRunnable);
    mIsInDrawPass = false;
  }
}
