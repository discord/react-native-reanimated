"use strict";

// Registry to map component tags to component instances
const componentRegistry = new Map();
// Cache for delayed updates when components aren't found
const pendingUpdates = new Map();
export const ComponentRegistry = {
  // Register a component instance with its tag
  register: (tag, component) => {
    componentRegistry.set(tag, component);

    // Check if there are pending updates for this tag
    const pendingUpdate = pendingUpdates.get(tag);
    if (pendingUpdate) {
      component._updateReanimatedProps(pendingUpdate);
      pendingUpdates.delete(tag);
    }
  },
  // Unregister a component
  unregister: tag => {
    componentRegistry.delete(tag);
  },
  // Get a component for a tag
  getComponent: tag => {
    return componentRegistry.get(tag);
  },
  // Cache an update for when component becomes available
  cacheUpdate: (tag, props) => {
    pendingUpdates.set(tag, props);
  }
};
//# sourceMappingURL=ComponentRegistry.js.map