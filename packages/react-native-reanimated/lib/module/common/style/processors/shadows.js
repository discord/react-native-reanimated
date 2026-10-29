'use strict';

import { parseBoxShadowString } from "../../utils/index.js";
import { processColor } from "./colors.js";
const ERROR_MESSAGES = {
  notArrayObject(value) {
    'worklet';

    return `Box shadow value must be a string or an array of shadow objects (e.g. [{ offsetX, offsetY, color }]). Received: ${JSON.stringify(value)}.`;
  }
};
export const processBoxShadow = (value, context) => {
  'worklet';

  if (value === 'none') {
    return [];
  }
  const parsedShadow = typeof value === 'string' ? parseBoxShadowString(value) : value;
  if (!Array.isArray(parsedShadow)) {
    throw new Error(`[Reanimated] ${ERROR_MESSAGES.notArrayObject(parsedShadow)}`);
  }
  return parsedShadow.map(shadow => {
    const {
      color = '#000',
      offsetX = 0,
      offsetY = 0,
      spreadDistance = 0,
      blurRadius = 0,
      ...rest
    } = shadow;
    return {
      ...rest,
      blurRadius: parseFloat(blurRadius),
      color: processColor(color, context),
      offsetX: parseFloat(offsetX),
      offsetY: parseFloat(offsetY),
      spreadDistance: parseFloat(spreadDistance)
    };
  });
};
//# sourceMappingURL=shadows.js.map