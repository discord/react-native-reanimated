#include <worklets/Tools/Defs.h>
#include <worklets/WorkletRuntime/ReanimatedRuntime.h>

#include <cxxreact/MessageQueueThread.h>
#include <jsi/jsi.h>

#include <memory>
#include <utility>

#if JS_RUNTIME_HERMES
#include <worklets/WorkletRuntime/ReanimatedHermesRuntime.h>
#elif JS_RUNTIME_V8
#include <v8runtime/V8RuntimeFactory.h>
#else
#include <jsc/JSCRuntime.h>
#endif // JS_RUNTIME

namespace worklets {

using namespace facebook;
using namespace react;

std::shared_ptr<jsi::Runtime> ReanimatedRuntime::make(
    jsi::Runtime &rnRuntime,
    const std::shared_ptr<MessageQueueThread> &jsQueue,
    const std::string &name) {
  (void)rnRuntime; // used only for V8
#if JS_RUNTIME_HERMES
  // RN 0.85 COMPAT [NOT APPLICABLE]: jsQueue->quitSynchronous() is now called
  // here (before creating the runtime) because the constructor no longer takes
  // jsQueue and therefore cannot call it internally. In upstream reanimated 4
  // this entire MessageQueueThread/jsQueue pattern was removed — WorkletRuntime
  // uses a different async queue abstraction and never calls quitSynchronous().

  // This is required by iOS, because there is an assertion in the destructor
  // that the thread was indeed `quit` before.
  jsQueue->quitSynchronous();

  auto runtime = facebook::hermes::makeHermesRuntime();
  return std::make_shared<ReanimatedHermesRuntime>(std::move(runtime));
#elif JS_RUNTIME_V8
  // This is required by iOS, because there is an assertion in the destructor
  // that the thread was indeed `quit` before.
  jsQueue->quitSynchronous();

  auto config = std::make_unique<rnv8::V8RuntimeConfig>();
  config->enableInspector = false;
  config->appName = name;
  return rnv8::createSharedV8Runtime(&rnRuntime, std::move(config));
#else
  // This is required by iOS, because there is an assertion in the destructor
  // that the thread was indeed `quit` before
  jsQueue->quitSynchronous();

  return facebook::jsc::makeJSCRuntime();
#endif
}

} // namespace worklets
