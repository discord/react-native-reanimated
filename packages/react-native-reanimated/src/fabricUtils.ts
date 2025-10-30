'use strict';
/* eslint-disable */

import type { InternalHostInstance, ShadowNodeWrapper } from './commonTypes';
import { ReanimatedError } from './errors';
import {
  findHostInstance,
  HostInstance,
} from './platform-specific/findHostInstance';
import { IAnimatedComponentInternal } from './createAnimatedComponent/commonTypes';

let getInternalInstanceHandleFromPublicInstance: (ref: unknown) => {
  stateNode: { node: unknown };
};

export function getShadowNodeWrapperFromRef(
  ref: InternalHostInstance,
  hostInstance?: HostInstance
): ShadowNodeWrapper {
  let resolvedInstance =
    hostInstance?.__internalInstanceHandle ?? ref?.__internalInstanceHandle;

  if (!resolvedInstance) {
    if (ref.getNativeScrollRef) {
      resolvedInstance = (ref.getNativeScrollRef() as any)
        .__internalInstanceHandle;
    } else if ((ref as any)._reactInternals) {
      resolvedInstance = findHostInstance(ref as IAnimatedComponentInternal).__internalInstanceHandle;
    } else {
      throw new ReanimatedError(`Failed to find host instance for a ref.}`);
    }
  }

  return resolvedInstance!.stateNode.node as ShadowNodeWrapper;
}