#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/Fabric/PropsRegistry.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsProxy.h>

#include <react/renderer/uimanager/UIManagerCommitHook.h>

#include <memory>

using namespace facebook::react;

namespace reanimated {

class ReanimatedCommitHook
    : public UIManagerCommitHook,
      public std::enable_shared_from_this<ReanimatedCommitHook> {
 public:
  ReanimatedCommitHook(
      const std::shared_ptr<PropsRegistry> &propsRegistry,
      const std::shared_ptr<UIManager> &uiManager,
      const std::shared_ptr<LayoutAnimationsProxy> &layoutAnimationsProxy);

  ~ReanimatedCommitHook() noexcept override;

  void commitHookWasRegistered(UIManager const &) noexcept override {}

  void commitHookWasUnregistered(UIManager const &) noexcept override {}

  void maybeInitializeLayoutAnimations(SurfaceId surfaceId);

  RootShadowNode::Unshared shadowTreeWillCommit(
      ShadowTree const &shadowTree,
      RootShadowNode::Shared const &oldRootShadowNode,
      RootShadowNode::Unshared const &newRootShadowNode,
      const ShadowTreeCommitOptions& commitOptions) noexcept override;

  void shadowTreeCommitSucceeded(const ShadowTreeCommitOptions& commitOptions) override;
  void shadowTreeCommitFinalized(const ShadowTreeCommitOptions& commitOptions) override;

 private:
  std::shared_ptr<PropsRegistry> propsRegistry_;

  std::shared_ptr<UIManager> uiManager_;

  std::shared_ptr<LayoutAnimationsProxy> layoutAnimationsProxy_;

  SurfaceId currentMaxSurfaceId_ = -1;

  std::mutex mutex_; // Protects `currentMaxSurfaceId_`.

  // We lock the prop registry as long as our commit is in progress
  // A commit can either succeed of fail. When it succeeds we eventually
  // want to remove nodes from the registry, thus we want to control when to release
  std::optional<std::unique_lock<std::mutex>> propRegistryLock_;

  // Nodes that reanimated maintains that have become synced with React we want to remove
  // in case our commit succeeds:
  std::vector<Tag> tagsToRemove;
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
