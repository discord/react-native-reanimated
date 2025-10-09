import type { IAnimatedComponentInternal } from '../createAnimatedComponent/commonTypes';
export declare const ComponentRegistry: {
    register: (tag: number | HTMLElement, component: IAnimatedComponentInternal) => void;
    unregister: (tag: number | HTMLElement) => void;
    getComponent: (tag: number | HTMLElement) => IAnimatedComponentInternal | undefined;
    cacheUpdate: (tag: number | HTMLElement, props: any) => void;
};
//# sourceMappingURL=ComponentRegistry.d.ts.map