#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <react/renderer/components/root/RootShadowNode.h>
#include <react/renderer/core/ShadowNode.h>

#include <memory>
#include <unordered_map>
#include <utility>

using namespace facebook;
using namespace react;

namespace reanimated {

using NodeRemovalCallback = std::function<void(Tag tag, bool isFrozen)>;

class PropsRegistry {
 public:
  std::lock_guard<std::mutex> createLock() const;
  // returns a lock you need to hold when calling any of the methods below

  #ifdef RCT_NEW_ARCH_ENABLED
  void update(
      const std::shared_ptr<const ShadowNode> &shadowNode,
      folly::dynamic &&props,
    double timestamp);
  #else
  void update(
      const std::shared_ptr<const ShadowNode> &shadowNode,
      folly::dynamic &&props);
  #endif // RCT_NEW_ARCH_ENABLED

  void for_each(std::function<void(
                    const ShadowNodeFamily &family,
                    const folly::dynamic &props)> callback) const;

  void remove(const Tag tag);

  #ifdef RCT_NEW_ARCH_ENABLED
  jsi::Value getUpdatesOlderThanTimestamp(jsi::Runtime &rt, double timestamp);
  void removeUpdatesOlderThanTimestamp(double timestamp);
  #endif // RCT_NEW_ARCH_ENABLED
  
  void pauseReanimatedCommits() {
    isPaused_ = true;
  }

  bool shouldReanimatedSkipCommit() {
    return isPaused_;
  }

  void unpauseReanimatedCommits() {
    isPaused_ = false;
  }

  void pleaseCommitAfterPause() {
    shouldCommitAfterPause_ = true;
  }

  bool shouldCommitAfterPause() {
    return shouldCommitAfterPause_.exchange(false);
  }

  bool isEmpty() {
    return map_.empty();
  }

  void markNodeAsRemovable(const std::shared_ptr<const ShadowNode> &shadowNode);
  void unmarkNodeAsRemovable(Tag viewTag);
  void handleNodeRemovals(
      const RootShadowNode &rootShadowNode,
      const NodeRemovalCallback &callback = nullptr);

  // Custom discord added for removing nodes once they seem in sync with the shadow tree
  void markNodeAsImmediateRemovable(Tag tag);
  void unmarkNodeAsImmediateRemovable(Tag viewTag);
  void removeImmediateRemovableNodes();

  // Discord change: made public so that commit hook can lock it:
  mutable std::mutex mutex_; // Protects `map_`.
 private:
  using RemovableShadowNodes =
      std::unordered_map<Tag, std::shared_ptr<const ShadowNode>>;

  std::unordered_map<
      Tag,
      std::pair<std::shared_ptr<const ShadowNode>, folly::dynamic>>
      map_;
  RemovableShadowNodes removableShadowNodes_;
  std::unordered_set<Tag> immediateRemovableShadowNodes_;


  std::atomic<bool> isPaused_;
  std::atomic<bool> shouldCommitAfterPause_;
  std::unordered_map<Tag, double> timestampMap_; // viewTag -> timestamp, protected by `mutex_`
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
