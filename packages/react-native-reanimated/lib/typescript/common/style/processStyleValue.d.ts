import type { NonMutable, UnknownRecord, ValueProcessor, ValueProcessorContext } from '../types';
export declare function processStyleValue<V, R>(processor: ValueProcessor<V, R>, value: NonMutable<V>, context?: ValueProcessorContext): R | Record<string, R>;
export declare const WARN_MESSAGES: {
    ignoredValue(reason: string): string;
};
/**
 * Reports a style value that a processor rejected. The value is ignored like an
 * invalid CSS declaration instead of throwing, which on the UI runtime would
 * crash the app.
 */
export declare function warnIgnoredStyleValue(error: unknown): void;
/**
 * Processes `props[key]` in place. A rejected value is removed, so the prop
 * keeps its current value.
 */
export declare function processStylePropInPlace<V, R>(props: UnknownRecord, key: string, processor: ValueProcessor<V, R>): void;
//# sourceMappingURL=processStyleValue.d.ts.map