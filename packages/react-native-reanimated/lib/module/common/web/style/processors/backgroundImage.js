'use strict';

import { isNumber, maybeAddSuffix } from "../../../utils/index.js";
import { processColor } from "./colors.js";
const processColorStops = colorStops => colorStops.map(({
  color,
  positions
}) => {
  const positionsString = positions?.map(position => maybeAddSuffix(position, 'px')).join(' ') ?? '';
  if (color == null) {
    return positionsString;
  }
  const processedColor = processColor(color);
  return [processedColor, positionsString].filter(Boolean).join(' ');
}).join(', ');
const processRadialShapeAndSize = (shape, size) => {
  if (typeof size === 'string') {
    return `${shape} ${size}`;
  }
  if (shape === 'circle' && isNumber(size.x) && isNumber(size.y)) {
    return `circle ${Math.max(size.x, size.y)}px`;
  }
  return `ellipse ${maybeAddSuffix(size.x, 'px')} ${maybeAddSuffix(size.y, 'px')}`;
};
const processRadialPosition = position => Object.entries(position).map(([edge, offset]) => `${edge} ${maybeAddSuffix(offset, 'px')}`).join(' ');
export const processBackgroundImageWeb = value => {
  if (typeof value === 'string') {
    return value;
  }
  return value.map(backgroundImage => {
    const colorStops = processColorStops(backgroundImage.colorStops);
    if (backgroundImage.type === 'linear-gradient') {
      return `linear-gradient(${backgroundImage.direction ?? 'to bottom'}, ${colorStops})`;
    }
    const {
      shape = 'ellipse',
      size = 'farthest-corner',
      position = {
        top: '50%',
        left: '50%'
      }
    } = backgroundImage;
    return `radial-gradient(${processRadialShapeAndSize(shape, size)} at ${processRadialPosition(position)}, ${colorStops})`;
  }).join(', ');
};
//# sourceMappingURL=backgroundImage.js.map