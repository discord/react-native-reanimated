import { Image } from 'react-native';
interface AnimatedImageComplement extends Image {
  getNode(): Image;
}
export declare const AnimatedImage: import('../helperTypes').AnimatedComponentType<
  import('react-native').ImageProps
>;
export type AnimatedImage = typeof AnimatedImage & AnimatedImageComplement;
export {};
//# sourceMappingURL=Image.d.ts.map
