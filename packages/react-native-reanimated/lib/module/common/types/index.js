/* eslint-disable @typescript-eslint/no-explicit-any */
'use strict';

/**
 * Makes only mutable types (objects, arrays) readonly while leaving primitive
 * types unchanged. This prevents type issues caused by making other types
 * readonly, like Readonly<string> which isn't the same as string.
 */

export let ValueProcessorTarget = /*#__PURE__*/function (ValueProcessorTarget) {
  ValueProcessorTarget["CSS"] = "css";
  ValueProcessorTarget["Default"] = "default";
  return ValueProcessorTarget;
}({});
//# sourceMappingURL=index.js.map