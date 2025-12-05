/**
 * Hero Block Renderer
 */

import { BlockRendererProps } from '../BlockRenderer';

export const HeroBlock = ({ node, children }: BlockRendererProps) => {
  const {
    height = 'medium',
    bgColor,
    bgImage,
    overlay = false,
    overlayOpacity = 50,
    align = 'center',
  } = node.props;

  const heightClasses = {
    small: 'min-h-[300px]',
    medium: 'min-h-[500px]',
    large: 'min-h-[700px]',
    full: 'min-h-screen',
  };

  const alignClasses = {
    left: 'items-start text-left',
    center: 'items-center text-center',
    right: 'items-end text-right',
  };

  return (
    <div
      className={`relative w-full ${heightClasses[height as keyof typeof heightClasses] || 'min-h-[500px]'} flex ${
        alignClasses[align as keyof typeof alignClasses] || 'items-center text-center'
      } justify-center px-4`}
      style={{
        backgroundColor: bgColor,
        backgroundImage: bgImage ? `url(${bgImage})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {overlay && bgImage && (
        <div
          className="absolute inset-0 bg-black"
          style={{ opacity: overlayOpacity / 100 }}
        />
      )}
      <div className="relative z-10 max-w-4xl">{children}</div>
    </div>
  );
};
