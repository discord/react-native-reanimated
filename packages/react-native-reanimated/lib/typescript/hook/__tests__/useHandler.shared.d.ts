import type { DependencyList } from '../commonTypes';
import { useHandler } from '../useHandler';
type Handlers = Parameters<typeof useHandler>[0];
export declare function renderUseHandler(handlers: Handlers, deps?: DependencyList): any;
export declare function runCommonTests(): void;
export {};
//# sourceMappingURL=useHandler.shared.d.ts.map