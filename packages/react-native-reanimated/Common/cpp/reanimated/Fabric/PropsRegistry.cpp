#define RCT_NEW_ARCH_ENABLED 1
#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/Fabric/PropsRegistry.h>
#include <cstring>

namespace reanimated {

std::lock_guard<std::mutex> PropsRegistry::createLock() const {
  return std::lock_guard<std::mutex>(mutex_);
}

void PropsRegistry::update(
    const std::shared_ptr<const ShadowNode> &shadowNode,
    folly::dynamic &&props,
    double timestamp) {
  const auto tag = shadowNode->getTag();
  const auto it = map_.find(tag);
  if (it == map_.cend()) {
    // we need to store ShadowNode because `ShadowNode::getFamily`
    // returns `ShadowNodeFamily const &` which is non-owning
    map_[tag] = std::make_pair(shadowNode, props);
    timestampMap_[shadowNode->getTag()] = timestamp;
  } else {
    // no need to update `.first` because ShadowNode's family never changes
    // merge new props with old props
    it->second.second.update(props);

    timestampMap_[shadowNode->getTag()] = timestamp;
  }
}

void PropsRegistry::for_each(std::function<void(
                                 const ShadowNodeFamily &family,
                                 const folly::dynamic &props)> callback) const {
  for (const auto &[_, value] : map_) {
    callback(value.first->getFamily(), value.second);
  }
}

void PropsRegistry::markNodeAsRemovable(
    const std::shared_ptr<const ShadowNode> &shadowNode) {
  removableShadowNodes_[shadowNode->getTag()] = shadowNode;
}

void PropsRegistry::unmarkNodeAsRemovable(Tag viewTag) {
  removableShadowNodes_.erase(viewTag);
}

void PropsRegistry::handleNodeRemovals(
    const RootShadowNode &rootShadowNode,
    const NodeRemovalCallback &callback) {
  RemovableShadowNodes remainingShadowNodes;

  for (const auto &[tag, shadowNode] : removableShadowNodes_) {
    if (!shadowNode) {
      // Stopgap for bad shadowNode
      map_.erase(tag);
      continue;
    }

    const auto &family = shadowNode->getFamily();
    const auto &ancestors = family.getAncestors(rootShadowNode);

    // Determine if component is frozen
    // isFrozen=true means component still has parents (with Suspense parent being one of them)
    // isFrozen=false means component is truly unmounting
    bool isFrozen = false;
    for (const auto &[parentNode, _] : ancestors) {
      const auto parentComponentName = parentNode.get().getComponentName();
      if (strstr(parentComponentName, "Suspense") != nullptr) {
        isFrozen = true;
        break;
      }
    }

    // Notify JavaScript about the freeze decision
    if (callback) {
      callback(tag, isFrozen);
    }

    // PropsRegistry decision: keep if has ancestors, remove if no ancestors
    if (!ancestors.empty()) {
      remainingShadowNodes.emplace(tag, shadowNode);
    } else {
      map_.erase(tag);
    }
  }

  removableShadowNodes_ = std::move(remainingShadowNodes);
}

void PropsRegistry::remove(const Tag tag) {
  map_.erase(tag);
}

void PropsRegistry::markNodeAsImmediateRemovable(Tag tag) {
  immediateRemovableShadowNodes_.emplace(tag);
}

void PropsRegistry::unmarkNodeAsImmediateRemovable(Tag tag) {
  immediateRemovableShadowNodes_.erase(tag);
}

void PropsRegistry::removeImmediateRemovableNodes() {
  for (auto& tag : immediateRemovableShadowNodes_) {
      map_.erase(tag);
  }
  immediateRemovableShadowNodes_.clear();
}

jsi::Value PropsRegistry::getUpdatesOlderThanTimestamp(jsi::Runtime &rt, const double timestamp) {
  std::vector<std::pair<Tag, std::reference_wrapper<const folly::dynamic>>> updates;

  for (const auto &[viewTag, pair] : map_) {
    if (timestampMap_.at(viewTag) < timestamp) {
      updates.emplace_back(viewTag, std::cref(pair.second));
    }
  }

  const jsi::Array array(rt, updates.size());
  size_t i = 0;
  for (const auto &[viewTag, styleProps] : updates) {
    const jsi::Object item(rt);
    item.setProperty(rt, "viewTag", viewTag);
    item.setProperty(rt, "styleProps", jsi::valueFromDynamic(rt, styleProps.get()));
    array.setValueAtIndex(rt, i++, item);
  }

  return jsi::Value(rt, array);
}

void PropsRegistry::removeUpdatesOlderThanTimestamp(const double timestamp) {
  for (auto it = timestampMap_.begin(); it != timestampMap_.end();) {
    const auto viewTag = it->first;
    const auto viewTimestamp = it->second;
    if (viewTimestamp < timestamp) {
      it = timestampMap_.erase(it);
      map_.erase(viewTag);
    } else {
      it++;
    }
  }
}

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
