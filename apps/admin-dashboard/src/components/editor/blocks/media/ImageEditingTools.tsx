/**
 * ImageEditingTools Component
 * Advanced image editing tools for crop, rotation, filters, and focal point
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import {
  Crop,
  RotateCw,
  RotateCcw,
  Move,
  ZoomIn,
  ZoomOut,
  Save,
  X,
  Palette,
  Sliders,
  AspectRatio,
  Focus
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FocalPoint {
  x: number; // 0-100 percentage
  y: number; // 0-100 percentage
}

interface CropData {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface DuotoneFilter {
  id: string;
  name: string;
  color1: string;
  color2: string;
}

interface ImageEditingToolsProps {
  imageUrl: string;
  onSave: (editedImageUrl: string, metadata: any) => void;
  onCancel: () => void;
  initialFocalPoint?: FocalPoint;
  initialCrop?: CropData;
  initialRotation?: number;
  initialFilters?: any;
}

const DUOTONE_PRESETS: DuotoneFilter[] = [
  { id: 'none', name: 'None', color1: '#000000', color2: '#ffffff' },
  { id: 'dark-blue-yellow', name: 'Dark Blue & Yellow', color1: '#000040', color2: '#ffff00' },
  { id: 'magenta-orange', name: 'Magenta & Orange', color1: '#c92a2a', color2: '#ff922b' },
  { id: 'purple-green', name: 'Purple & Green', color1: '#722ed1', color2: '#52c41a' },
  { id: 'blue-red', name: 'Blue & Red', color1: '#1971c2', color2: '#e03131' },
  { id: 'black-white', name: 'Black & White', color1: '#000000', color2: '#ffffff' },
  { id: 'foreground-background', name: 'Foreground & Background', color1: '#1a1a1a', color2: '#ffffff' },
  { id: 'primary-secondary', name: 'Primary & Secondary', color1: '#0073aa', color2: '#005177' },
  { id: 'grayscale', name: 'Grayscale', color1: '#737373', color2: '#ffffff' },
  { id: 'sepia', name: 'Sepia', color1: '#704214', color2: '#f4d03f' },
  { id: 'vintage', name: 'Vintage', color1: '#5d4037', color2: '#fff3e0' },
  { id: 'night-mode', name: 'Night Mode', color1: '#000051', color2: '#00b4d8' },
  { id: 'sunset', name: 'Sunset', color1: '#d32f2f', color2: '#ffa726' },
  { id: 'ocean', name: 'Ocean', color1: '#0d47a1', color2: '#29b6f6' },
  { id: 'forest', name: 'Forest', color1: '#1b5e20', color2: '#66bb6a' },
];

const ASPECT_RATIOS = [
  { label: 'Original', value: null },
  { label: '1:1', value: 1 },
  { label: '16:9', value: 16/9 },
  { label: '4:3', value: 4/3 },
  { label: '3:2', value: 3/2 },
  { label: '2:1', value: 2/1 },
];

export const ImageEditingTools: React.FC<ImageEditingToolsProps> = ({
  imageUrl,
  onSave,
  onCancel,
  initialFocalPoint = { x: 50, y: 50 },
  initialCrop,
  initialRotation = 0,
  initialFilters = {},
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [tool, setTool] = useState<'crop' | 'focal' | 'filter' | 'rotate'>('crop');
  const [focalPoint, setFocalPoint] = useState<FocalPoint>(initialFocalPoint);
  const [crop, setCrop] = useState<CropData | null>(initialCrop || null);
  const [rotation, setRotation] = useState(initialRotation);
  const [zoom, setZoom] = useState(1);
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);

  // Filter states
  const [brightness, setBrightness] = useState(initialFilters.brightness || 100);
  const [contrast, setContrast] = useState(initialFilters.contrast || 100);
  const [saturation, setSaturation] = useState(initialFilters.saturation || 100);
  const [selectedDuotone, setSelectedDuotone] = useState<string>(initialFilters.duotone || 'none');

  const [isDragging, setIsDragging] = useState(false);
  const [isCropping, setIsCropping] = useState(false);
  const [cropStart, setCropStart] = useState<{ x: number; y: number } | null>(null);

  // Load and setup image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (imageRef.current) {
        imageRef.current.src = imageUrl;
        redrawCanvas();
      }
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Redraw canvas with current settings
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    // Apply transformations
    ctx.save();

    // Rotation
    if (rotation !== 0) {
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.translate(-canvas.width / 2, -canvas.height / 2);
    }

    // Apply filters
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;

    // Draw image
    ctx.drawImage(img, 0, 0);

    // Apply duotone if selected
    if (selectedDuotone !== 'none') {
      applyDuotoneFilter(ctx, canvas, selectedDuotone);
    }

    ctx.restore();

    // Draw crop overlay if cropping
    if (crop && tool === 'crop') {
      drawCropOverlay(ctx, crop);
    }

    // Draw focal point if in focal mode
    if (tool === 'focal') {
      drawFocalPoint(ctx);
    }
  }, [rotation, brightness, contrast, saturation, selectedDuotone, crop, tool, focalPoint]);

  // Apply duotone filter
  const applyDuotoneFilter = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, duotoneId: string) => {
    const duotone = DUOTONE_PRESETS.find(d => d.id === duotoneId);
    if (!duotone || duotoneId === 'none') return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Convert duotone colors to RGB
    const color1 = hexToRgb(duotone.color1);
    const color2 = hexToRgb(duotone.color2);

    for (let i = 0; i < data.length; i += 4) {
      // Get luminance (brightness) of the pixel
      const luminance = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) / 255;

      // Interpolate between the two duotone colors based on luminance
      data[i] = color1.r + (color2.r - color1.r) * luminance;     // Red
      data[i + 1] = color1.g + (color2.g - color1.g) * luminance; // Green
      data[i + 2] = color1.b + (color2.b - color1.b) * luminance; // Blue
      // Alpha stays the same (data[i + 3])
    }

    ctx.putImageData(imageData, 0, 0);
  };

  // Helper function to convert hex to RGB
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  };

  // Draw crop overlay
  const drawCropOverlay = (ctx: CanvasRenderingContext2D, cropData: CropData) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';

    // Draw overlay outside crop area
    ctx.fillRect(0, 0, canvas.width, cropData.y);
    ctx.fillRect(0, cropData.y, cropData.x, cropData.height);
    ctx.fillRect(cropData.x + cropData.width, cropData.y, canvas.width - cropData.x - cropData.width, cropData.height);
    ctx.fillRect(0, cropData.y + cropData.height, canvas.width, canvas.height - cropData.y - cropData.height);

    // Draw crop border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(cropData.x, cropData.y, cropData.width, cropData.height);

    // Draw crop handles
    const handleSize = 8;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;

    // Corner handles
    const handles = [
      { x: cropData.x - handleSize/2, y: cropData.y - handleSize/2 },
      { x: cropData.x + cropData.width - handleSize/2, y: cropData.y - handleSize/2 },
      { x: cropData.x - handleSize/2, y: cropData.y + cropData.height - handleSize/2 },
      { x: cropData.x + cropData.width - handleSize/2, y: cropData.y + cropData.height - handleSize/2 },
    ];

    handles.forEach(handle => {
      ctx.fillRect(handle.x, handle.y, handleSize, handleSize);
      ctx.strokeRect(handle.x, handle.y, handleSize, handleSize);
    });

    ctx.restore();
  };

  // Draw focal point
  const drawFocalPoint = (ctx: CanvasRenderingContext2D) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const x = (focalPoint.x / 100) * canvas.width;
    const y = (focalPoint.y / 100) * canvas.height;

    ctx.save();

    // Draw crosshair
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);

    // Vertical line
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();

    // Horizontal line
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();

    // Draw center circle
    ctx.setLineDash([]);
    ctx.strokeStyle = '#ffffff';
    ctx.fillStyle = 'rgba(59, 130, 246, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  };

  // Handle mouse events for focal point and crop
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    if (tool === 'focal') {
      setFocalPoint({
        x: (x / canvas.width) * 100,
        y: (y / canvas.height) * 100,
      });
      setIsDragging(true);
    } else if (tool === 'crop') {
      setCropStart({ x, y });
      setIsCropping(true);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    if (isDragging && tool === 'focal') {
      setFocalPoint({
        x: Math.max(0, Math.min(100, (x / canvas.width) * 100)),
        y: Math.max(0, Math.min(100, (y / canvas.height) * 100)),
      });
    } else if (isCropping && cropStart) {
      const width = Math.abs(x - cropStart.x);
      const height = Math.abs(y - cropStart.y);
      const cropX = Math.min(x, cropStart.x);
      const cropY = Math.min(y, cropStart.y);

      // Apply aspect ratio if set
      let finalWidth = width;
      let finalHeight = height;

      if (aspectRatio) {
        if (width / height > aspectRatio) {
          finalWidth = height * aspectRatio;
        } else {
          finalHeight = width / aspectRatio;
        }
      }

      setCrop({
        x: cropX,
        y: cropY,
        width: finalWidth,
        height: finalHeight,
      });
    }
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(false);
    setIsCropping(false);
    setCropStart(null);
  };

  // Redraw when settings change
  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  // Rotate image
  const handleRotate = (degrees: number) => {
    setRotation((prev) => (prev + degrees) % 360);
  };

  // Reset crop
  const resetCrop = () => {
    setCrop(null);
  };

  // Apply crop to aspect ratio
  const applyCropAspectRatio = (ratio: number | null) => {
    setAspectRatio(ratio);
    if (ratio && crop) {
      const newHeight = crop.width / ratio;
      setCrop({
        ...crop,
        height: newHeight,
      });
    }
  };

  // Save edited image
  const handleSave = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create final canvas with crops applied
    const finalCanvas = document.createElement('canvas');
    const finalCtx = finalCanvas.getContext('2d');
    if (!finalCtx) return;

    if (crop) {
      finalCanvas.width = crop.width;
      finalCanvas.height = crop.height;
      finalCtx.drawImage(canvas, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);
    } else {
      finalCanvas.width = canvas.width;
      finalCanvas.height = canvas.height;
      finalCtx.drawImage(canvas, 0, 0);
    }

    // Convert to blob and create URL
    finalCanvas.toBlob((blob) => {
      if (blob) {
        const editedUrl = URL.createObjectURL(blob);
        const metadata = {
          focalPoint,
          rotation,
          filters: {
            brightness,
            contrast,
            saturation,
            duotone: selectedDuotone,
          },
          crop,
        };
        onSave(editedUrl, metadata);
      }
    }, 'image/jpeg', 0.9);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex">
      {/* Toolbar */}
      <div className="w-80 bg-white p-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Edit Image</h3>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Tool Selection */}
        <div className="grid grid-cols-2 gap-2 mb-6">
          <Button
            variant={tool === 'crop' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTool('crop')}
            className="flex items-center gap-2"
          >
            <Crop className="h-4 w-4" />
            Crop
          </Button>
          <Button
            variant={tool === 'focal' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTool('focal')}
            className="flex items-center gap-2"
          >
            <Focus className="h-4 w-4" />
            Focal Point
          </Button>
          <Button
            variant={tool === 'rotate' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTool('rotate')}
            className="flex items-center gap-2"
          >
            <RotateCw className="h-4 w-4" />
            Rotate
          </Button>
          <Button
            variant={tool === 'filter' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTool('filter')}
            className="flex items-center gap-2"
          >
            <Palette className="h-4 w-4" />
            Filters
          </Button>
        </div>

        {/* Tool-specific controls */}
        {tool === 'crop' && (
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Aspect Ratio</Label>
              <div className="grid grid-cols-2 gap-2">
                {ASPECT_RATIOS.map((ratio) => (
                  <Button
                    key={ratio.label}
                    variant={aspectRatio === ratio.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => applyCropAspectRatio(ratio.value)}
                  >
                    {ratio.label}
                  </Button>
                ))}
              </div>
            </div>
            <Button onClick={resetCrop} variant="outline" size="sm" className="w-full">
              Reset Crop
            </Button>
          </div>
        )}

        {tool === 'focal' && (
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Focal Point</Label>
              <p className="text-sm text-gray-600 mb-4">
                Click on the image to set the focal point. This determines which part of the image remains visible when it's cropped.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">X Position</Label>
                  <div className="text-sm font-mono">{focalPoint.x.toFixed(1)}%</div>
                </div>
                <div>
                  <Label className="text-xs">Y Position</Label>
                  <div className="text-sm font-mono">{focalPoint.y.toFixed(1)}%</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {tool === 'rotate' && (
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Rotation</Label>
              <div className="flex gap-2">
                <Button onClick={() => handleRotate(-90)} variant="outline" size="sm">
                  <RotateCcw className="h-4 w-4 mr-1" />
                  -90°
                </Button>
                <Button onClick={() => handleRotate(90)} variant="outline" size="sm">
                  <RotateCw className="h-4 w-4 mr-1" />
                  +90°
                </Button>
              </div>
              <div className="mt-2 text-sm text-gray-600">
                Current: {rotation}°
              </div>
            </div>
          </div>
        )}

        {tool === 'filter' && (
          <div className="space-y-6">
            {/* Duotone Filters */}
            <div>
              <Label className="text-sm font-medium mb-3 block">Duotone Filters</Label>
              <div className="grid grid-cols-2 gap-2">
                {DUOTONE_PRESETS.map((duotone) => (
                  <Button
                    key={duotone.id}
                    variant={selectedDuotone === duotone.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedDuotone(duotone.id)}
                    className="flex items-center gap-2"
                  >
                    <div className="flex gap-1">
                      <div
                        className="w-3 h-3 rounded-full border border-gray-300"
                        style={{ backgroundColor: duotone.color1 }}
                      />
                      <div
                        className="w-3 h-3 rounded-full border border-gray-300"
                        style={{ backgroundColor: duotone.color2 }}
                      />
                    </div>
                    <span className="text-xs">{duotone.name}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Basic Adjustments */}
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  Brightness: {brightness}%
                </Label>
                <Slider
                  value={[brightness]}
                  onValueChange={(value) => setBrightness(value[0])}
                  min={0}
                  max={200}
                  step={1}
                />
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">
                  Contrast: {contrast}%
                </Label>
                <Slider
                  value={[contrast]}
                  onValueChange={(value) => setContrast(value[0])}
                  min={0}
                  max={200}
                  step={1}
                />
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">
                  Saturation: {saturation}%
                </Label>
                <Slider
                  value={[saturation]}
                  onValueChange={(value) => setSaturation(value[0])}
                  min={0}
                  max={200}
                  step={1}
                />
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 mt-8">
          <Button onClick={onCancel} variant="outline" className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSave} className="flex-1">
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 flex items-center justify-center p-8" ref={containerRef}>
        <div className="relative max-w-full max-h-full">
          <canvas
            ref={canvasRef}
            className="max-w-full max-h-full object-contain border border-gray-600 cursor-crosshair"
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
          />
          <img
            ref={imageRef}
            src={imageUrl}
            alt=""
            className="hidden"
          />
        </div>
      </div>
    </div>
  );
};

export default ImageEditingTools;