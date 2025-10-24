#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/Fabric/ReanimatedCommitShadowNode.h>
#include <reanimated/Fabric/ReanimatedMountHook.h>
#include <reanimated/NativeModules/ReanimatedModuleProxy.h>

namespace reanimated {

ReanimatedMountHook::ReanimatedMountHook(
    const std::shared_ptr<PropsRegistry> &propsRegistry,
    const std::shared_ptr<UIManager> &uiManager,
    const std::shared_ptr<ReanimatedModuleProxy> &moduleProxy)
    : propsRegistry_(propsRegistry), uiManager_(uiManager), moduleProxy_(moduleProxy) {
  uiManager_->registerMountHook(*this);
}

ReanimatedMountHook::~ReanimatedMountHook() noexcept {
  uiManager_->unregisterMountHook(*this);
}

void ReanimatedMountHook::shadowTreeDidMount(
    const RootShadowNode::Shared &rootShadowNode,
#if REACT_NATIVE_MINOR_VERSION >= 81
    HighResTimeStamp
#else
    double
#endif // REACT_NATIVE_MINOR_VERSION >= 81
    ) noexcept {

  auto reaShadowNode =
      std::reinterpret_pointer_cast<ReanimatedCommitShadowNode>(
          std::const_pointer_cast<RootShadowNode>(rootShadowNode));

  if (reaShadowNode->hasReanimatedMountTrait()) {
    // We mark reanimated commits with ReanimatedMountTrait. We don't want other
    // shadow nodes to use this trait, but since this rootShadowNode is Shared,
    // we don't have that guarantee. That's why we also unset this trait in the
    // commit hook. We remove it here mainly for the sake of cleanliness.
    reaShadowNode->unsetReanimatedMountTrait();
    return;
  }

  {
    auto lock = propsRegistry_->createLock();

    // Create callback to notify JavaScript about node removal decisions
    auto callback = [this](Tag tag, bool isFrozen) {
      auto moduleProxy = moduleProxy_.lock();
      if (moduleProxy) {
        moduleProxy->onNodeRemovalDecision(tag, isFrozen);
      }
    };
    propsRegistry_->handleNodeRemovals(*rootShadowNode, callback);

    // When commit from React Native has finished, we reset the skip commit flag
    // in order to allow Reanimated to commit its tree
    propsRegistry_->unpauseReanimatedCommits();
    if (!propsRegistry_->shouldCommitAfterPause()) {
      return;
    }
  }

  const auto &shadowTreeRegistry = uiManager_->getShadowTreeRegistry();
  shadowTreeRegistry.visit(
      rootShadowNode->getSurfaceId(), [&](ShadowTree const &shadowTree) {
        shadowTree.commit(
            [&](RootShadowNode const &oldRootShadowNode)
                -> RootShadowNode::Unshared {
              PropsMap propsMap;

              RootShadowNode::Unshared rootNode =
                  std::static_pointer_cast<RootShadowNode>(
                      oldRootShadowNode.ShadowNode::clone({}));
              {
                auto lock = propsRegistry_->createLock();

                propsRegistry_->for_each([&](const ShadowNodeFamily &family,
                                             const folly::dynamic &props) {
                  propsMap[&family].emplace_back(props);
                });

                rootNode =
                    std::move(cloneShadowTreeWithNewProps(oldRootShadowNode, propsMap).newRoot);
              }

              // Mark the commit as Reanimated commit so that we can
              // distinguish it in ReanimatedCommitHook.
              auto reaShadowNode =
                  std::reinterpret_pointer_cast<ReanimatedCommitShadowNode>(
                      rootNode);
              reaShadowNode->setReanimatedCommitTrait();

              return rootNode;
            },
            {/* .enableStateReconciliation = */
             false,
             /* .mountSynchronously = */ true});
      });
}

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
