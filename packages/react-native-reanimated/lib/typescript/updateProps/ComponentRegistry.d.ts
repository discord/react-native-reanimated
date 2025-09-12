import type { IAnimatedComponentInternal } from '../createAnimatedComponent/commonTypes';
export declare const ComponentRegistry: {
    register: (tag: number | HTMLElement, component: IAnimatedComponentInternal) => void;
    unregister: (tag: number | HTMLElement) => void;
    getComponent: (tag: number | HTMLElement) => IAnimatedComponentInternal | undefined;
};
//# sourceMappingURL=ComponentRegistry.d.ts.map