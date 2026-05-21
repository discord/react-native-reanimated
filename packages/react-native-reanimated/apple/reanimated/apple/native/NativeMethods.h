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
