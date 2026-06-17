/* eslint-disable camelcase */
'use strict';

import type { InternalHostInstance } from '../commonTypes';
import type { IAnimatedComponentInternal } from '../createAnimatedComponent/commonTypes';
import { ReanimatedError } from '../errors';

type HostInstanceFabric = {
  __internalInstanceHandle?: Record<string, unknown>;
  __nativeTag?: number;
  __viewConfig?: Record<string, unknown>;
  // Legacy ReactFabricHostComponent key (e.g. react-native-macos).
  _viewConfig?: Record<string, unknown>;
};

type HostInstancePaper = {
  _nativeTag?: number;
  viewConfig?: Record<string, unknown>;
};

export type HostInstance = HostInstanceFabric & HostInstancePaper;

function findHostInstanceFastPath(maybeNativeRef: HostInstance | undefined) {
  if (!maybeNativeRef) {
    return undefined;
  }
  if (
    maybeNativeRef.__internalInstanceHandle &&
    maybeNativeRef.__nativeTag &&
    // ReactFabricHostComponent (e.g. react-native-macos) exposes `_viewConfig`;
    // ReactNativeElement uses `__viewConfig`.
    (maybeNativeRef.__viewConfig || maybeNativeRef._viewConfig)
  ) {
    // This is a native ref to a Fabric component
    return maybeNativeRef;
  }
  if (maybeNativeRef._nativeTag && maybeNativeRef.viewConfig) {
    // This is a native ref to a Paper component
    return maybeNativeRef;
  }
  // That means it’s a ref to a non-native component, and it’s necessary
  // to call `findHostInstance_DEPRECATED` on them.
  return undefined;
}

function resolveFindHostInstance_DEPRECATED() {
  if (findHostInstance_DEPRECATED !== undefined) {
    return;
  }
  try {
    const ReactFabric = require('react-native/Libraries/Renderer/shims/ReactFabric');
    // Since RN 0.77 ReactFabric exports findHostInstance_DEPRECATED in default object so we're trying to
    // access it first, then fallback on named export
    findHostInstance_DEPRECATED =
      ReactFabric?.default?.findHostInstance_DEPRECATED ??
      ReactFabric?.findHostInstance_DEPRECATED;
  } catch (e) {
    throw new ReanimatedError(
      'Failed to resolve findHostInstance_DEPRECATED'
    );
  }
}

let findHostInstance_DEPRECATED: (ref: unknown) => HostInstance;
export function findHostInstance(
  component: IAnimatedComponentInternal | InternalHostInstance
): HostInstance {
  // Fast path for native refs
  const hostInstance = findHostInstanceFastPath(
    (component as IAnimatedComponentInternal)._componentRef as HostInstance
  );
  if (hostInstance !== undefined) {
    return hostInstance;
  }

  resolveFindHostInstance_DEPRECATED();
  /*
    The Fabric implementation of `findHostInstance_DEPRECATED` requires a React ref as an argument
    rather than a native ref. Prefer the resolved component ref when available so components can
    forward their ref to the host view that should be animated. Components that expose an animatable
    ref via `getAnimatableRef` already have it resolved into `_componentRef`.
  */
  return findHostInstance_DEPRECATED(
    (component as IAnimatedComponentInternal)._componentRef ?? component
  );
}
