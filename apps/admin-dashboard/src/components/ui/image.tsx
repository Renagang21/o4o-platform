import { ImgHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface ImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  fallback?: string;
}

const Image = forwardRef<HTMLImageElement, ImageProps>(
  ({ className, src, alt, fallback = '/placeholder.svg', onError, ...props }, ref) => {
    const handleError = (e: React.SyntheticEvent<HTMLImageElement>) => {
      if (fallback && e.currentTarget.src !== fallback) {
        e.currentTarget.src = fallback;
      }
      onError?.(e);
    };

    return (
      <img
        ref={ref}
        src={src}
        alt={alt}
        onError={handleError}
        className={cn(
          'max-w-full h-auto',
          className
        )}
        {...props}
      />
    );
  }
);

Image.displayName = 'Image';

export { Image };