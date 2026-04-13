'use strict';
import type { SharedValue } from './commonTypes';
import { makeMutable } from './core';
import type { Descriptor } from './hook/commonTypes';

export interface ViewDescriptorsSet {
  shareableViewDescriptors: SharedValue<Descriptor[]>;
  add: (item: Descriptor) => void;
  remove: (viewTag: number) => void;
  has: (viewTag: number) => boolean;
  setForceUpdate: (fn: (() => void) | null) => void;
}

export function makeViewDescriptorsSet(): ViewDescriptorsSet {
  const shareableViewDescriptors = makeMutable<Descriptor[]>([]);
  const viewTags = new Set<number>();
  // Tracks tags that were previously mounted then removed — these need forceUpdate on re-add.
  const removedTags = new Set<number>();
  // Plain closure variable — NOT stored on the data object to avoid being frozen by Reanimated.
  let forceUpdateFn: (() => void) | null = null;

  const data: ViewDescriptorsSet = {
    shareableViewDescriptors,

    setForceUpdate: (fn: (() => void) | null) => {
      forceUpdateFn = fn;
    },

    add: (item: Descriptor) => {
      const tag = item.tag as number;
      const isReregistration = removedTags.has(tag);
      removedTags.delete(tag);
      viewTags.add(tag);
      const forceUpdate = isReregistration ? forceUpdateFn : null;
      shareableViewDescriptors.modify((descriptors) => {
        'worklet';
        const index = descriptors.findIndex(
          (descriptor) => descriptor.tag === item.tag
        );
        if (index !== -1) {
          descriptors[index] = item;
        } else {
          descriptors.push(item);
          forceUpdate?.();
        }
        return descriptors;
      }, false);
    },

    remove: (viewTag: number) => {
      viewTags.delete(viewTag);
      removedTags.add(viewTag);
      shareableViewDescriptors.modify((descriptors) => {
        'worklet';
        const index = descriptors.findIndex(
          (descriptor) => descriptor.tag === viewTag
        );
        if (index !== -1) {
          descriptors.splice(index, 1);
        }
        return descriptors;
      }, false);
    },

    has: (viewTag: number) => viewTags.has(viewTag),
  };

  return data;
}
