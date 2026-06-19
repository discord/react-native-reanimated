package com.swmansion.reanimated;

import android.util.Log;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.fabric.FabricUIManager;
import com.facebook.react.uimanager.UIManagerHelper;
import com.facebook.react.uimanager.common.UIManagerType;
import java.lang.reflect.Field;
import java.lang.reflect.Method;

class ReaCompatibility {
  private FabricUIManager fabricUIManager;

  // TODO(#9681): Temporary workaround for RN >= 0.86. Since RN 0.86,
  // overrideBySynchronousMountPropsAtMountingAndroid defaults on, so RN's only public
  // synchronous-update API (synchronouslyUpdateViewOnUIThread) seeds the tagToSynchronousMountProps
  // cache that then clamps later commits and freezes animations. On RN >= 0.86 we instead call
  // MountingManager.updatePropsSynchronously directly (apply without cache seeding) via reflection,
  // since MountingManager is internal. On older RN the flag is off, so we keep the original RN path
  // unchanged (gated by BuildConfig.REACT_NATIVE_MINOR_VERSION). Remove once RN exposes a
  // non-seeding synchronous-update API.
  private Object mountingManager;
  private Method updatePropsSynchronouslyMethod;

  public ReaCompatibility(ReactApplicationContext reactApplicationContext) {
    fabricUIManager =
        (FabricUIManager)
            UIManagerHelper.getUIManager(reactApplicationContext, UIManagerType.FABRIC);
  }

  private Object getMountingManager() {
    if (mountingManager == null && fabricUIManager != null) {
      try {
        Field field = FabricUIManager.class.getDeclaredField("mMountingManager");
        field.setAccessible(true);
        mountingManager = field.get(fabricUIManager);
      } catch (Exception e) {
        Log.w("Reanimated", "Unable to resolve MountingManager via reflection", e);
      }
    }
    return mountingManager;
  }

  private Method getUpdatePropsSynchronouslyMethod(Object mountingManager) {
    if (updatePropsSynchronouslyMethod == null && mountingManager != null) {
      for (Method method : mountingManager.getClass().getMethods()) {
        if (method.getName().startsWith("updatePropsSynchronously")
            && method.getParameterTypes().length == 2) {
          method.setAccessible(true);
          updatePropsSynchronouslyMethod = method;
          break;
        }
      }
    }
    return updatePropsSynchronouslyMethod;
  }

  public void registerFabricEventListener(NodesManager nodesManager) {
    if (fabricUIManager != null) {
      fabricUIManager.getEventDispatcher().addListener(nodesManager);
    }
  }

  public void unregisterFabricEventListener(NodesManager nodesManager) {
    if (fabricUIManager != null) {
      fabricUIManager.getEventDispatcher().removeListener(nodesManager);
    }
  }

  public void synchronouslyUpdateUIProps(int viewTag, ReadableMap uiProps) {
    if (fabricUIManager == null) {
      return;
    }
    if (BuildConfig.REACT_NATIVE_MINOR_VERSION >= 86) {
      Object mountingManager = getMountingManager();
      Method method = getUpdatePropsSynchronouslyMethod(mountingManager);
      if (mountingManager != null && method != null) {
        try {
          method.invoke(mountingManager, viewTag, uiProps);
          return;
        } catch (Exception e) {
          Log.w("Reanimated", "synchronouslyUpdateUIProps failed for tag " + viewTag, e);
          return;
        }
      }
      // Fall through to the legacy RN path if reflection was unavailable.
    }
    fabricUIManager.synchronouslyUpdateViewOnUIThread(viewTag, uiProps);
  }
}
