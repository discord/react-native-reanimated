import type { ComponentProps, Ref } from 'react';
import { Component } from 'react';
import type { StyleProp } from 'react-native';
import type { AnyComponent, UnknownRecord } from '../../common';
import type { AnimatableDOMElement, AnimatedComponentRef, IAnimatedComponentInternalBase, ViewInfo } from '../../createAnimatedComponent/commonTypes';
import type { DefaultStyle } from '../../hook/commonTypes';
import { CSSManager } from '../platform';
import type { CSSStyle } from '../types';
export type AnimatedComponentProps = UnknownRecord & {
    ref?: Ref<Component>;
    style?: StyleProp<DefaultStyle>;
};
export default class AnimatedComponent<P extends UnknownRecord = AnimatedComponentProps, S extends object = UnknownRecord> extends Component<P, S> implements IAnimatedComponentInternalBase {
    ChildComponent: AnyComponent;
    _CSSManager?: CSSManager;
    _viewInfo?: ViewInfo;
    _cssStyle: CSSStyle;
    _componentRef: AnimatedComponentRef | HTMLElement | null;
    _rawComponentRef: Component | HTMLElement | null;
    _componentDOMRef: AnimatableDOMElement | null;
    _willUnmount: boolean;
    _forwardedRefCleanup?: () => void;
    constructor(ChildComponent: AnyComponent, props: P);
    getComponentViewTag(): number;
    _onSetLocalRef(): void;
    _getViewInfo(): ViewInfo;
    _resolveViewInfo(): ViewInfo;
    _setComponentRef: (ref: Component | HTMLElement) => void;
    _refreshComponentRef(): void;
    _updateComponentRef(componentRef: AnimatedComponentRef | HTMLElement | null): void;
    _detachHostBindings(_previousViewInfo: ViewInfo): void;
    _attachHostBindings(): void;
    _createCSSManager(): CSSManager;
    _resolveComponentRef: (ref: Component | HTMLElement | null) => AnimatedComponentRef | null;
    _updateStyles(props: P): void;
    componentDidMount(): void;
    componentWillUnmount(): void;
    shouldComponentUpdate(nextProps: P): boolean;
    render(props?: ComponentProps<AnyComponent>): import("react").JSX.Element;
}
//# sourceMappingURL=AnimatedComponent.d.ts.map