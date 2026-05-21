#pragma once

// RN 0.85 COMPAT [NOT APPLICABLE]: react/jni/CxxModuleWrapper.h was removed
// in RN 0.85. The include was dead code here. JNIHelper.h has no equivalent
// in upstream reanimated 4 — the file was removed entirely.

#include <fbjni/fbjni.h>
#include <jsi/JSIDynamic.h>
#include <jsi/jsi.h>
#include <react/jni/JMessageQueueThread.h>
#include <react/jni/WritableNativeMap.h>
#include <string>

namespace reanimated {

using namespace facebook::jni;
using namespace facebook;
using namespace react;

struct JNIHelper {
  struct PropsMap : jni::JavaClass<PropsMap, JMap<JString, JObject>> {
    static constexpr auto kJavaDescriptor = "Ljava/util/HashMap;";

    static local_ref<PropsMap> create();
    void put(const std::string &key, jni::local_ref<JObject> object);
  };

  static jni::local_ref<PropsMap> ConvertToPropsMap(
      jsi::Runtime &rt,
      const jsi::Object &props);
};

}; // namespace reanimated
