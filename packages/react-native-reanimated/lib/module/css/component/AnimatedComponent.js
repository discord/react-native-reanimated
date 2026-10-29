'use strict';

import { Component } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { IS_JEST } from "../../common/index.js";
import { assignRef } from "../../reactUtils.js";
import { CSSManager } from '../platform';
import { filterCSSProps } from "./utils.js";
import { jsx as _jsx } from "react/jsx-runtime";
// The element classes do not exist off the DOM (SSR, native Jest project).
function isAnimatableDOMElement(value) {
  return typeof HTMLElement !== 'undefined' && value instanceof HTMLElement || typeof SVGElement !== 'undefined' && value instanceof SVGElement;
}

// TODO - change these ugly underscore prefixed methods and properties to real
// private/protected ones when possible (when changes from this repo are merged
// to the main one)
export default class AnimatedComponent extends Component {
  _cssStyle = {}; // RN style object with Reanimated CSS properties
  _componentRef = null;
  _rawComponentRef = null;
  _componentDOMRef = null;
  _willUnmount = false;
  constructor(ChildComponent, props) {
    super(props);
    this.ChildComponent = ChildComponent;
  }
  getComponentViewTag() {
    return this._getViewInfo().viewTag;
  }
  _onSetLocalRef() {
    // noop - can be overridden in subclasses
  }
  _getViewInfo() {
    if (this._viewInfo !== undefined) {
      return this._viewInfo;
    }
    this._viewInfo = this._resolveViewInfo();
    return this._viewInfo;
  }
  _resolveViewInfo() {
    const shadowNodeWrapper = null;
    const reactViewName = undefined;

    // At this point we assume that `_setComponentRef` was already called and `_componentRef` is set.
    // `this._componentRef` on web represents HTMLElement of our component, that's why we use casting
    // TODO - implement a valid solution later on - this is a temporary fix
    const viewTag = this._componentRef;
    const DOMElement = this._componentDOMRef;
    const viewInfo = {
      viewTag,
      shadowNodeWrapper,
      reactViewName
    };
    if (DOMElement) {
      viewInfo.DOMElement = DOMElement;
    }
    return viewInfo;
  }
  _setComponentRef = ref => {
    // Forward to user ref prop (if one has been specified)
    const forwardedRef = this.props.forwardedRef;
    if (!ref) {
      // component has been unmounted
      if (this._forwardedRefCleanup) {
        this._forwardedRefCleanup();
        this._forwardedRefCleanup = undefined;
      } else {
        assignRef(forwardedRef, null);
      }
      return;
    }
    this._forwardedRefCleanup = assignRef(forwardedRef, ref);
    if (ref !== this._rawComponentRef) {
      this._rawComponentRef = ref;
      const resolved = this._resolveComponentRef(ref);
      if (resolved !== this._componentRef) {
        this._updateComponentRef(resolved);
      }
    }
    this._onSetLocalRef();
  };
  _refreshComponentRef() {
    // A component exposing `getAnimatableRef` may point at a different host
    // instance than when its ref was set (its own child may have been replaced),
    // while React never calls `_setComponentRef` again.
    const rawRef = this._rawComponentRef;
    if (!rawRef?.getAnimatableRef) {
      return;
    }
    const resolved = this._resolveComponentRef(rawRef);
    if (resolved !== this._componentRef) {
      this._updateComponentRef(resolved);
    }
  }
  _updateComponentRef(componentRef) {
    const previousViewInfo = this._viewInfo;
    this._componentRef = componentRef;
    if (previousViewInfo === undefined) {
      return;
    }

    // A new ref (e.g. a fresh imperative handle) may still resolve to the same host.
    const viewInfo = this._resolveViewInfo();
    if (viewInfo.viewTag === previousViewInfo.viewTag) {
      this._viewInfo = viewInfo;
      return;
    }

    // Release the previous host's bindings while its view info is still cached.
    this._detachHostBindings(previousViewInfo);
    this._viewInfo = viewInfo;
    if (this._CSSManager) {
      this._CSSManager.unmountCleanup();
      this._CSSManager = this._createCSSManager();
      this._CSSManager.update(this._cssStyle, this.props);
    }

    // Bind here as well: the ref callback may fire without an update of this component.
    this._attachHostBindings();
  }
  _detachHostBindings(_previousViewInfo) {
    // Called with the previous host's view info right before the component is
    // pointed at a new host. Subclasses release what they bound to that view.
  }
  _attachHostBindings() {
    // Subclasses bind to the new host what `_detachHostBindings` released.
  }
  _createCSSManager() {
    return new CSSManager(this._getViewInfo(),
    // `react-native-svg`'s web classes don't set `static displayName`
    // (only the native side does), so fall back to the class `name` which
    // matches the React `displayName` pattern used elsewhere.
    this.ChildComponent.displayName ?? this.ChildComponent.name);
  }
  _resolveComponentRef = ref => {
    let componentRef = ref;
    // Component can specify ref which should be animated when animated version of the component is created.
    // Otherwise, we animate the component itself.
    if (componentRef?.getAnimatableRef) {
      componentRef = componentRef.getAnimatableRef();
    }
    // Case for SVG components on Web
    if (componentRef?.elementRef) {
      this._componentDOMRef = componentRef.elementRef.current;
    } else {
      this._componentDOMRef = isAnimatableDOMElement(componentRef) ? componentRef : null;
    }
    return componentRef;
  };
  _updateStyles(props) {
    this._cssStyle = StyleSheet.flatten(props.style) ?? {};
  }
  componentDidMount() {
    this._updateStyles(this.props);
    if (!IS_JEST) {
      this._CSSManager ??= this._createCSSManager();
      this._CSSManager?.update(this._cssStyle, this.props);
    }
    this._willUnmount = false;
  }
  componentWillUnmount() {
    if (!IS_JEST && this._CSSManager) {
      this._CSSManager.unmountCleanup();
    }
    this._willUnmount = true;
  }
  shouldComponentUpdate(nextProps) {
    this._updateStyles(nextProps);
    if (this._CSSManager) {
      this._CSSManager.update(this._cssStyle, nextProps);
    }

    // TODO - maybe check if the render is necessary instead of always returning true
    return true;
  }
  render(props) {
    const {
      ChildComponent
    } = this;
    const platformProps = Platform.select({
      web: {},
      default: {
        collapsable: false
      }
    });
    return /*#__PURE__*/_jsx(ChildComponent, {
      ...filterCSSProps(props ?? this.props),
      ...platformProps,
      // Casting is used here, because ref can be null - in that case it cannot be assigned to HTMLElement.
      // After spending some time trying to figure out what to do with this problem, we decided to leave it this way
      ref: this._setComponentRef
    });
  }
}
//# sourceMappingURL=AnimatedComponent.js.map