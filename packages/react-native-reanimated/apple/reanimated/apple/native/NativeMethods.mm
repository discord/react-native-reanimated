#import <React/RCTEventDispatcher.h>
#import <reanimated/apple/REAUIKit.h>
#import <reanimated/apple/native/NativeMethods.h>

// RN 0.85 COMPAT [NOT APPLICABLE]: RCTScrollView is guarded by
// RCT_REMOVE_LEGACY_ARCH in the prebuilt RN 0.85 framework and is absent from
// its module interface. The scrollTo() function is paper-arch only and its
// caller (makeScrollToFunction) is already guarded by #else RCT_NEW_ARCH_ENABLED.
// In upstream reanimated 4, NativeMethods.mm does not exist at all — scrollTo
// is implemented in JS via dispatchCommand on the Fabric side.
#ifndef RCT_NEW_ARCH_ENABLED
#import <React/RCTScrollView.h>
#endif // RCT_NEW_ARCH_ENABLED

namespace reanimated {

std::vector<std::pair<std::string, double>> measure(int viewTag, RCTUIManager *uiManager)
{
  REAUIView *view = [uiManager viewForReactTag:@(viewTag)];

  REAUIView *rootView = view;

  if (view == nil) {
    return std::vector<std::pair<std::string, double>>(1, std::make_pair("x", -1234567.0));
  }

  while (rootView.superview && ![rootView isReactRootView]) {
    rootView = rootView.superview;
  }

  if (rootView == nil) {
    return std::vector<std::pair<std::string, double>>(1, std::make_pair("x", -1234567.0));
  }

  CGRect frame = view.frame;
  CGRect globalBounds = [view convertRect:view.bounds toView:rootView];

  return {
      {"x", frame.origin.x},
      {"y", frame.origin.y},
      {"width", globalBounds.size.width},
      {"height", globalBounds.size.height},
      {"pageX", globalBounds.origin.x},
      {"pageY", globalBounds.origin.y},
  };
}

#ifndef RCT_NEW_ARCH_ENABLED
void scrollTo(int scrollViewTag, RCTUIManager *uiManager, double x, double y, bool animated)
{
  REAUIView *view = [uiManager viewForReactTag:@(scrollViewTag)];
  RCTScrollView *scrollView = (RCTScrollView *)view;
  [scrollView scrollToOffset:(CGPoint){(CGFloat)x, (CGFloat)y} animated:animated];
}
#endif // RCT_NEW_ARCH_ENABLED

void setGestureState(id<RNGestureHandlerStateManager> gestureHandlerStateManager, int handlerTag, int newState)
{
  if (gestureHandlerStateManager != nil) {
    [gestureHandlerStateManager setGestureState:newState forHandler:handlerTag];
  }
}

} // namespace reanimated
