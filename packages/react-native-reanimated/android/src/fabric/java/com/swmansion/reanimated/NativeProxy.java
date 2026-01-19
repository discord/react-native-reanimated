package com.swmansion.reanimated;

import androidx.annotation.OptIn;
import com.facebook.jni.HybridData;
import com.facebook.proguard.annotations.DoNotStrip;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.UiThreadUtil;
import com.facebook.react.common.annotations.FrameworkAPI;
import com.facebook.react.fabric.FabricUIManager;
import com.facebook.react.turbomodule.core.CallInvokerHolderImpl;
import com.facebook.react.uimanager.IllegalViewOperationException;
import com.facebook.react.uimanager.UIManagerHelper;
import com.facebook.react.uimanager.common.UIManagerType;
import com.swmansion.reanimated.layoutReanimation.LayoutAnimations;
import com.swmansion.reanimated.layoutReanimation.NativeMethodsHolder;
import com.swmansion.reanimated.nativeProxy.NativeProxyCommon;
import com.swmansion.worklets.JSCallInvokerResolver;
import com.swmansion.worklets.WorkletsModule;
import java.util.HashMap;
import java.util.Objects;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * @noinspection JavaJniMissingFunction
 */
public class NativeProxy extends NativeProxyCommon {
  @DoNotStrip
  @SuppressWarnings("unused")
  private final HybridData mHybridData;

  /**
   * Invalidating concurrently could be fatal. It shouldn't happen in a normal flow, but it doesn't
   * cost us much to add synchronization for extra safety.
   */
  private final AtomicBoolean mInvalidated = new AtomicBoolean(false);

  private final FabricUIManager mFabricUIManager;

  public @OptIn(markerClass = FrameworkAPI.class) NativeProxy(
      ReactApplicationContext context, WorkletsModule workletsModule) {
    super(context);
    ReactFeatureFlagsWrapper.enableMountHooks();

    FabricUIManager fabricUIManager =
        (FabricUIManager) UIManagerHelper.getUIManager(context, UIManagerType.FABRIC);
    mFabricUIManager = fabricUIManager;

    LayoutAnimations LayoutAnimations = new LayoutAnimations(context);

    CallInvokerHolderImpl callInvokerHolder = JSCallInvokerResolver.getJSCallInvokerHolder(context);
    mHybridData =
        initHybrid(
            workletsModule,
            Objects.requireNonNull(context.getJavaScriptContextHolder()).get(),
            callInvokerHolder,
            LayoutAnimations,
            context.isBridgeless(),
            fabricUIManager);

    prepareLayoutAnimations(LayoutAnimations);
    installJSIBindings();
    if (BuildConfig.DEBUG) {
      checkCppVersion();
    }
  }

  @OptIn(markerClass = FrameworkAPI.class)
  private native HybridData initHybrid(
      WorkletsModule workletsModule,
      long jsContext,
      CallInvokerHolderImpl jsCallInvokerHolder,
      LayoutAnimations LayoutAnimations,
      boolean isBridgeless,
      FabricUIManager fabricUIManager);

  public native boolean isAnyHandlerWaitingForEvent(String eventName, int emitterReactTag);

  public native void performOperations(boolean isTriggeredByEvent, boolean mountSync);

  /** Modifies tags in place, setting not mounted view tags to -1 at their index. */
  @DoNotStrip
  public boolean preserveMountedTags(int[] tags) {
    // Discord note: this causes UI glitches such as documented in https://github.com/software-mansion/react-native-reanimated/pull/8450/
    // if (!UiThreadUtil.isOnUiThread()) {
    //     // We want to avoid executing LayoutAnimationProxy::addOngoingAnimation
    //     // from the JS thread to avoid the occurrence of this bug:
    //     // https://github.com/software-mansion/react-native-reanimated/issues/7493#issuecomment-3728435106
    //     return false;
    // }

    for (int i = 0; i < tags.length; i++) {
      try {
      // Note: resolveView has assertOnUiThread, which only logs as softexception in debug
      // It is actually completely thread safe and there is a RFC in RN to do something about it
        if (mFabricUIManager.resolveView(tags[i]) == null) {
          tags[i] = -1;
        }
      } catch (IllegalViewOperationException ex) {
        tags[i] = -1;
      }
    }

    return true;
  }

  @Override
  protected HybridData getHybridData() {
    return mHybridData;
  }

  private native void invalidateCpp();

  protected void invalidate() {
    if (mInvalidated.getAndSet(true)) {
      return;
    }
    if (mHybridData != null && mHybridData.isValid()) {
      invalidateCpp();
    }
  }

  public static NativeMethodsHolder createNativeMethodsHolder(
      LayoutAnimations ignoredLayoutAnimations) {
    return new NativeMethodsHolder() {
      @Override
      public void startAnimation(int tag, int type, HashMap<String, Object> values) {
        // NOT IMPLEMENTED
      }

      @Override
      public boolean isLayoutAnimationEnabled() {
        // NOT IMPLEMENTED
        return false;
      }

      @Override
      public int findPrecedingViewTagForTransition(int tag) {
        // NOT IMPLEMENTED
        return -1;
      }

      @Override
      public boolean shouldAnimateExiting(int tag, boolean shouldAnimate) {
        // NOT IMPLEMENTED
        return false;
      }

      @Override
      public boolean hasAnimation(int tag, int type) {
        // NOT IMPLEMENTED
        return false;
      }

      @Override
      public void clearAnimationConfig(int tag) {
        // NOT IMPLEMENTED
      }

      @Override
      public void cancelAnimation(int tag) {
        // NOT IMPLEMENTED
      }

      @Override
      public void checkDuplicateSharedTag(int viewTag, int screenTag) {
        // NOT IMPLEMENTED
      }

      @Override
      public int[] getSharedGroup(int viewTag) {
        // NOT IMPLEMENTED
        return new int[] {};
      }
    };
  }
}
