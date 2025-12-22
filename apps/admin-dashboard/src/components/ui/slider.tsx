import { forwardRef, MouseEvent, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export interface SliderProps {
  /** Unique identifier for the slider */
  id?: string;
  className?: string;
  value?: number[];
  defaultValue?: number[];
  onValueChange?: (value: number[]) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
}

const Slider = forwardRef<HTMLDivElement, SliderProps>(
  ({ className, value: controlledValue, defaultValue = [0], onValueChange, min = 0, max = 100, step = 1, disabled }, ref) => {
    const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
    const value = controlledValue ?? uncontrolledValue;
    const sliderValue = value[0] ?? 0;
    
    const trackRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);
    
    const handleValueChange = (newValue: number) => {
      const clampedValue = Math.min(Math.max(newValue, min), max);
      const steppedValue = Math.round(clampedValue / step) * step;
      const newValues = [steppedValue];
      
      if (controlledValue === undefined) {
        setUncontrolledValue(newValues);
      }
      onValueChange?.(newValues);
    };
    
    const calculateValue = (clientX: number) => {
      if (!trackRef.current) return;
      
      const rect = trackRef.current.getBoundingClientRect();
      const percentage = (clientX - rect.left) / rect.width;
      const rawValue = percentage * (max - min) + min;
      
      return rawValue;
    };
    
    const handleMouseDown = (e: MouseEvent) => {
      if (disabled) return;
      
      isDragging.current = true;
      const newValue = calculateValue(e.clientX);
      if (newValue !== undefined) {
        handleValueChange(newValue);
      }
    };
    
    useEffect(() => {
      const handleMouseMove = (e: globalThis.MouseEvent) => {
        if (!isDragging.current || disabled) return;
        
        const newValue = calculateValue(e.clientX);
        if (newValue !== undefined) {
          handleValueChange(newValue);
        }
      };
      
      const handleMouseUp = () => {
        isDragging.current = false;
      };
      
      if (isDragging.current) {
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        
        return () => {
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
        };
      }
    }, [disabled, handleValueChange, max, min]);
    
    const percentage = ((sliderValue - min) / (max - min)) * 100;
    
    return (
      <div
        ref={ref}
        className={cn(
          "relative flex w-full touch-none select-none items-center",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
      >
        <div
          ref={trackRef}
          className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary cursor-pointer"
          onMouseDown={handleMouseDown}
        >
          <div
            className="absolute h-full bg-primary transition-none"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div
          className={cn(
            "absolute h-5 w-5 rounded-full border-2 border-primary bg-background",
            "ring-offset-background transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            disabled && "pointer-events-none",
            !disabled && "cursor-grab active:cursor-grabbing"
          )}
          style={{ left: `${percentage}%`, transform: 'translateX(-50%)' }}
          onMouseDown={handleMouseDown}
        >
          <input
            type="range"
            value={sliderValue}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            className="sr-only"
            onChange={(e: any) => handleValueChange(Number(e.target.value))}
          />
        </div>
      </div>
    );
  }
);

Slider.displayName = 'Slider';

export { Slider };