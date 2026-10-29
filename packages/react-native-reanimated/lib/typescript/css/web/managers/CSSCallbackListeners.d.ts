import type { ReanimatedHTMLElement } from '../../../ReanimatedModule/js-reanimated';
import { CSSCallbackStore } from '../../models';
type CallbackMap<Prop extends string, Payload> = Partial<Record<Prop, ((payload: Payload) => void) | undefined>>;
export declare class CSSCallbackListeners<Prop extends string, Payload> extends CSSCallbackStore<Prop, Payload> {
    private readonly element;
    private readonly eventNameByProp;
    private readonly buildPayload;
    private readonly attachedListeners;
    private detachFrame;
    constructor(element: ReanimatedHTMLElement, eventNameByProp: Record<Prop, string>, buildPayload: (event: Event) => Payload);
    sync(callbacks: CallbackMap<Prop, Payload>): void;
    scheduleDetach(): void;
    private static scheduleDetachFrame;
    protected onPresenceChanged(present: ReadonlySet<Prop>): void;
    private createListener;
}
export {};
//# sourceMappingURL=CSSCallbackListeners.d.ts.map