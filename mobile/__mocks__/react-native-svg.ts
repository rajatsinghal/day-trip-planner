// Jest mock for react-native-svg.
// Renders all SVG primitives as plain stub components.
import * as React from 'react';

type AnyProps = Record<string, unknown> & { children?: React.ReactNode };

const stub = (name: string) => {
  const Component: React.FC<AnyProps> = (props) =>
    React.createElement(name as any, props, props.children as React.ReactNode);
  Component.displayName = name;
  return Component;
};

export const Svg = stub('Svg');
export const Path = stub('Path');
export const Rect = stub('Rect');
export const Circle = stub('Circle');
export const Ellipse = stub('Ellipse');
export const Line = stub('Line');
export const Polyline = stub('Polyline');
export const Polygon = stub('Polygon');
export const G = stub('G');
export const Text = stub('Text');
export const TSpan = stub('TSpan');
export const Defs = stub('Defs');
export const Use = stub('Use');
export const Image = stub('Image');
export const ClipPath = stub('ClipPath');
export const LinearGradient = stub('LinearGradient');
export const RadialGradient = stub('RadialGradient');
export const Stop = stub('Stop');
export const Symbol = stub('Symbol');
export const Mask = stub('Mask');
export const Pattern = stub('Pattern');
export const ForeignObject = stub('ForeignObject');

export default Svg;
