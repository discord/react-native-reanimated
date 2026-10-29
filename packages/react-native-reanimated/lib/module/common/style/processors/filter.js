'use strict';

import { camelizeKebabCase } from "../../utils/conversions.js";
import { isLength, isNumber } from "../../utils/guards.js";
import { CSS_NUMBER_PATTERN } from "../../utils/parsers.js";
import { processColor } from "./colors.js";

// Capture filter functions and their content eg "brightness(0.5) opacity(1)" => [["brightness(0.5)", "brightness", "0.5"], ["opacity(1)", "opacity", "1"]]
const FILTER_REGEX = /([\w-]+)\(([^()]*|\([^()]*\)|[^()]*\([^()]*\)[^()]*)\)/g;
// Capture two groups: current transform value and optional unit -> "21.37px" => ["21.37px", "21.37", "px"] + accepts scientific notation like 'e-14'
const FILTER_VALUE_REGEX = new RegExp(`^(${CSS_NUMBER_PATTERN})([a-z%]*)$`);
// Capture drop-shadow parts "10px 5px 5px #888888" => ["10px", "5px", "5px", "#888888"]
const DROP_SHADOW_REGEX = /[^,\s()]+(?:\([^()]*\))?/g;
const parseHueRotate = value => {
  'worklet';

  const {
    numberValue,
    unit
  } = value;
  if (numberValue !== 0 && unit !== 'deg' && unit !== 'rad') {
    return null;
  }
  return unit === 'rad' ? 180 * numberValue / Math.PI : numberValue;
};
const parseBlur = value => {
  'worklet';

  const {
    numberValue,
    unit
  } = value;
  if (unit && unit !== 'px' || numberValue < 0) {
    return null;
  }
  return numberValue;
};
const parsePercentageFilter = value => {
  'worklet';

  const {
    numberValue,
    unit
  } = value;
  if (unit && unit !== '%' || numberValue < 0) {
    return null;
  }
  return unit === '%' ? numberValue / 100 : numberValue;
};
const LENGTH_MAPPINGS = ['offsetX', 'offsetY', 'standardDeviation'];
const parseDropShadowString = value => {
  'worklet';

  const match = value.match(DROP_SHADOW_REGEX) ?? [];
  const result = {
    offsetX: 0,
    offsetY: 0
  };
  let foundLengthsCount = 0;
  for (const part of match) {
    if (isLength(part)) {
      if (!part.trim().match(FILTER_VALUE_REGEX)) {
        return null;
      }
      result[LENGTH_MAPPINGS[foundLengthsCount++]] = parseFloat(part);
    } else {
      result.color = part.trim();
    }
  }
  return result;
};
const parseDropShadow = (value, context) => {
  'worklet';

  const dropShadow = typeof value === 'string' ? parseDropShadowString(value) : value;
  if (dropShadow === null) {
    return null;
  }
  const {
    color = '#000',
    offsetX = 0,
    offsetY = 0,
    standardDeviation = 0
  } = dropShadow;
  const parsedStdDev = parseFloat(standardDeviation);
  if (parsedStdDev < 0) {
    return null;
  }
  return {
    // TODO - add support for IOS dynamic colors in CSS (for now we just assume that it's a number)
    color: processColor(color, context),
    offsetX: parseFloat(offsetX),
    offsetY: parseFloat(offsetY),
    standardDeviation: parsedStdDev
  };
};
const parseFilterProperty = (filterName, filterValue, context) => {
  'worklet';

  // We need to handle dropShadow separately because of its complex structure
  if (filterName === 'dropShadow') {
    const dropShadow = parseDropShadow(filterValue, context);
    if (dropShadow === null) {
      return null;
    }
    return {
      dropShadow
    };
  }
  let numberValue;
  let unit;
  if (isNumber(filterValue)) {
    // Numeric hueRotate values are treated as degrees.
    // Unit validation only applies to string values like 'hueRotate(90deg)'.
    if (filterName === 'hueRotate') {
      return {
        hueRotate: filterValue
      };
    }
    numberValue = filterValue;
    unit = '';
  } else {
    const stringValue = filterValue;
    const match = stringValue.match(FILTER_VALUE_REGEX);
    if (!match) {
      return null;
    }
    numberValue = parseFloat(match[1]);
    unit = match[2];
  }
  let amount;
  switch (filterName) {
    case 'hueRotate':
      amount = parseHueRotate({
        numberValue,
        unit
      });
      break;
    case 'blur':
      amount = parseBlur({
        numberValue,
        unit
      });
      break;
    case 'brightness':
    case 'contrast':
    case 'grayscale':
    case 'invert':
    case 'opacity':
    case 'saturate':
    case 'sepia':
      amount = parsePercentageFilter({
        numberValue,
        unit
      });
      break;
    default:
      return null;
  }
  if (amount === null) {
    return null;
  }
  return {
    [filterName]: amount
  };
};
const parseFilterString = (value, context) => {
  'worklet';

  const matches = Array.from(value.matchAll(FILTER_REGEX));
  const filterArray = [];
  for (const match of matches) {
    const [, name, content] = match;
    if (!name || !content) {
      return [];
    }
    const parsed = parseFilterProperty(camelizeKebabCase(name), content, context);
    if (parsed === null) {
      return [];
    }
    filterArray.push(parsed);
  }
  return filterArray;
};
const parseFilterArray = (value, context) => {
  'worklet';

  const filterArray = [];
  for (const filter of value) {
    const entries = Object.entries(filter);
    // Each filter object holds exactly one function, like `{ blur: 2 }`.
    const parsed = entries.length === 1 ? parseFilterProperty(entries[0][0], entries[0][1], context) : null;
    if (parsed === null) {
      return [];
    }
    filterArray.push(parsed);
  }
  return filterArray;
};
export const ERROR_MESSAGES = {
  invalidFilter(value) {
    'worklet';

    return `Invalid filter value: ${JSON.stringify(value)}`;
  }
};
export const processFilter = (value, context) => {
  'worklet';

  // `none` and an empty string or array clear the filter.
  if (value === 'none' || value.length === 0) {
    return [];
  }
  const filterArray = typeof value === 'string' ? parseFilterString(value, context) : parseFilterArray(value, context);

  // One invalid function invalidates the whole declaration, like in CSS.
  if (filterArray.length === 0) {
    throw new Error(`[Reanimated] ${ERROR_MESSAGES.invalidFilter(value)}`);
  }
  return filterArray;
};
//# sourceMappingURL=filter.js.map