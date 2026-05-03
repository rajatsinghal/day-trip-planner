// Jest mock for @expo/vector-icons (ESM, not transformable in node test env).
// Each icon set is a stub component that renders its props as a string.

import * as React from 'react';

type IconProps = { name?: string; size?: number; color?: string };

const stub = (label: string) => {
  const Component: React.FC<IconProps> = (props) =>
    React.createElement('Text' as any, props, `${label}:${props.name ?? ''}`);
  Component.displayName = label;
  return Component;
};

export const Ionicons = stub('Ionicons');
export const MaterialIcons = stub('MaterialIcons');
export const FontAwesome = stub('FontAwesome');
export const Feather = stub('Feather');
export const AntDesign = stub('AntDesign');
export const MaterialCommunityIcons = stub('MaterialCommunityIcons');
export default { Ionicons, MaterialIcons, FontAwesome, Feather, AntDesign, MaterialCommunityIcons };
