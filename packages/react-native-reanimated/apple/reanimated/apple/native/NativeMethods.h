#import <Foundation/Foundation.h>
#import <React/RCTUIManager.h>
#import <reanimated/apple/RNGestureHandlerStateManager.h>
#import <string>
#import <utility>
#import <vector>

namespace reanimated {

std::vector<std::pair<std::string, double>> measure(
    int viewTag,
    RCTUIManager *uiManager);
// RN 0.85 COMPAT [NOT APPLICABLE]: scrollTo() uses RCTScrollView which was
// removed from RN 0.85's new-arch prebuilt. Upstream reanimated 4 has no
// native scrollTo at all — scroll is handled via Fabric dispatchCommand in JS.
#ifndef RCT_NEW_ARCH_ENABLED
void scrollTo(
    int scrollViewTag,
    RCTUIManager *uiManager,
    double x,
    double y,
    bool animated);
#endif // RCT_NEW_ARCH_ENABLED
void setGestureState(
    id<RNGestureHandlerStateManager> gestureHandlerStateManager,
    int handlerTag,
    int newState);

} // namespace reanimated
