import type { IAnimatedComponentInternal } from '../createAnimatedComponent/commonTypes';

// Registry to map component tags to component instances
const componentRegistry = new Map<number | HTMLElement, IAnimatedComponentInternal>();
// Cache for delayed updates when components aren't found
const pendingUpdates = new Map<number | HTMLElement, any>();

export const ComponentRegistry = {
  // Register a component instance with its tag
  register: (tag: number | HTMLElement, component: IAnimatedComponentInternal) => {
    componentRegistry.set(tag, component);

    // Check if there are pending updates for this tag
    const pendingUpdate = pendingUpdates.get(tag);
    if (pendingUpdate) {
      component._updateReanimatedProps(pendingUpdate);
      pendingUpdates.delete(tag);
    }
  },

  // Unregister a component
  unregister: (tag: number | HTMLElement) => {
    componentRegistry.delete(tag);
  },

  // Get a component for a tag
  getComponent: (tag: number | HTMLElement): IAnimatedComponentInternal | undefined => {
    return componentRegistry.get(tag);
  },

  // Cache an update for when component becomes available
  cacheUpdate: (tag: number | HTMLElement, props: any) => {
    pendingUpdates.set(tag, props);
  }
};
