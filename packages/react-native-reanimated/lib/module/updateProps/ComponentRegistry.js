"use strict";

// Registry to map component tags to component instancesAdd commentMore actions
const componentRegistry = new Map();
export const ComponentRegistry = {
  // Register a component instance with its tag
  register: (tag, component) => {
    componentRegistry.set(tag, component);
  },
  // Unregister a component
  unregister: tag => {
    componentRegistry.delete(tag);
  },
  // Get a component for a tag
  getComponent: tag => {
    return componentRegistry.get(tag);
  }
};
//# sourceMappingURL=ComponentRegistry.js.map