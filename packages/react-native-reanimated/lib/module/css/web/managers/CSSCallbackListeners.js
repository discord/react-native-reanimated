'use strict';

import { CSSCallbackStore } from "../../models/index.js";
export class CSSCallbackListeners extends CSSCallbackStore {
  attachedListeners = new Map();
  detachFrame = null;
  constructor(element, eventNameByProp, buildPayload) {
    super(Object.keys(eventNameByProp));
    this.element = element;
    this.eventNameByProp = eventNameByProp;
    this.buildPayload = buildPayload;
  }
  sync(callbacks) {
    if (this.detachFrame !== null) {
      cancelAnimationFrame(this.detachFrame);
      this.detachFrame = null;
    }
    super.sync(callbacks);
  }
  scheduleDetach() {
    if (this.attachedListeners.size === 0 || this.detachFrame !== null) {
      return;
    }

    // A suspended frame must not keep an otherwise unreachable element and its
    // callbacks alive. Older browsers retain the existing cleanup behavior.
    const ref = typeof WeakRef === 'undefined' ? {
      deref: () => this
    } : new WeakRef(this);
    this.detachFrame = CSSCallbackListeners.scheduleDetachFrame(ref, false);
  }
  static scheduleDetachFrame(ref, finalFrame) {
    // Keep this closure outside the instance method so it captures only ref,
    // never the manager or a dereferenced instance from the previous frame.
    return requestAnimationFrame(() => {
      const listeners = ref.deref();
      if (!listeners) {
        return;
      }
      if (finalFrame) {
        listeners.detachFrame = null;
        listeners.detach();
      } else {
        // Cleanup can start during animation-event dispatch. The first frame
        // may run in that same rendering update; cancellations arrive next.
        listeners.detachFrame = CSSCallbackListeners.scheduleDetachFrame(ref, true);
      }
    });
  }
  onPresenceChanged(present) {
    for (const [prop, listener] of this.attachedListeners) {
      if (!present.has(prop)) {
        this.attachedListeners.delete(prop);
        this.element.removeEventListener(this.eventNameByProp[prop], listener);
      }
    }
    for (const prop of present) {
      if (this.attachedListeners.has(prop)) {
        continue;
      }
      const listener = this.createListener(prop);
      this.attachedListeners.set(prop, listener);
      this.element.addEventListener(this.eventNameByProp[prop], listener);
    }
  }
  createListener(prop) {
    return event => {
      // Animation/transition events bubble; only handle this element's own.
      if (event.target !== this.element) {
        return;
      }
      this.invoke(prop, this.buildPayload(event));
    };
  }
}
//# sourceMappingURL=CSSCallbackListeners.js.map