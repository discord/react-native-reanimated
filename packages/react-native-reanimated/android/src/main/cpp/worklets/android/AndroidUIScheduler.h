#pragma once

// RN 0.85 COMPAT [EQUIVALENT]: react/jni/CxxModuleWrapper.h was removed in
// RN 0.85. The include was dead code (CxxModuleWrapper was never used here).
// Upstream worklets' AndroidUIScheduler.h also has no CxxModuleWrapper include.

#include <worklets/Tools/UIScheduler.h>

#include <fbjni/fbjni.h>
#include <jni.h>
#include <jsi/jsi.h>
#include <react/jni/JMessageQueueThread.h>

#include <memory>

namespace worklets {

using namespace facebook;
using namespace worklets;

class AndroidUIScheduler : public jni::HybridClass<AndroidUIScheduler> {
 public:
  static auto constexpr kJavaDescriptor =
      "Lcom/swmansion/worklets/AndroidUIScheduler;";
  static jni::local_ref<jhybriddata> initHybrid(
      jni::alias_ref<jhybridobject> jThis);
  static void registerNatives();

  std::shared_ptr<UIScheduler> getUIScheduler() {
    return uiScheduler_;
  }

  void scheduleTriggerOnUI();

 private:
  friend HybridBase;

  void triggerUI();

  void invalidate();

  jni::global_ref<AndroidUIScheduler::javaobject> javaPart_;
  std::shared_ptr<UIScheduler> uiScheduler_;

  explicit AndroidUIScheduler(
      jni::alias_ref<AndroidUIScheduler::jhybridobject> jThis);
};

} // namespace worklets
