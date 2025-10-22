/**
 * BulkEditPanel - Bulk editing for multiple slides
 * Phase 2: Advanced editing features
 */

import React, { useState } from 'react';
import {
  Palette,
  Type,
  Image,
  Settings,
  Check,
  X,
  Layers,
  Copy,
  Trash2,
  Eye,
  EyeOff
} from 'lucide-react';
import { Slide } from './types';

interface BulkEditPanelProps {
  slides: Slide[];
  selectedIndices: Set<number>;
  onApplyChanges: (indices: number[], changes: Partial<Slide>) => void;
  onDuplicateSelected: () => void;
  onDeleteSelected: () => void;
  onToggleVisibilitySelected: () => void;
  onClose: () => void;
}

const BulkEditPanel: React.FC<BulkEditPanelProps> = ({
  slides,
  selectedIndices,
  onApplyChanges,
  onDuplicateSelected,
  onDeleteSelected,
  onToggleVisibilitySelected,
  onClose
}) => {
  const [backgroundColor, setBackgroundColor] = useState<string>('');
  const [textColor, setTextColor] = useState<string>('');
  const [gradientEnabled, setGradientEnabled] = useState(false);
  const [gradientStart, setGradientStart] = useState('#ffffff');
  const [gradientEnd, setGradientEnd] = useState('#000000');
  const [gradientAngle, setGradientAngle] = useState(90);
  const [fontSize, setFontSize] = useState<string>('');
  const [fontWeight, setFontWeight] = useState<string>('');
  const [textShadow, setTextShadow] = useState<string>('');
  const [transition, setTransition] = useState<string>('');
  
  const selectedCount = selectedIndices.size;
  const selectedSlides = Array.from(selectedIndices).map(i => slides[i]);

  const applyColors = () => {
    const changes: Partial<Slide> = {};
    
    if (backgroundColor) {
      changes.backgroundColor = backgroundColor;
    }
    
    if (textColor) {
      changes.textColor = textColor;
    }
    
    if (gradientEnabled) {
      changes.backgroundGradient = {
        type: 'linear',
        angle: gradientAngle,
        colors: [gradientStart, gradientEnd]
      };
    }
    
    onApplyChanges(Array.from(selectedIndices), changes);
  };

  const applyTextStyles = () => {
    const changes: Partial<Slide> = {};
    
    if (fontSize) {
      changes.textStyles = {
        ...changes.textStyles,
        fontSize: fontSize as 'small' | 'medium' | 'large' | 'x-large'
      };
    }
    
    if (fontWeight) {
      changes.textStyles = {
        ...changes.textStyles,
        fontWeight: fontWeight as 'normal' | 'bold' | 'light'
      };
    }
    
    if (textShadow) {
      changes.textStyles = {
        ...changes.textStyles,
        textShadow: textShadow as 'none' | 'subtle' | 'medium' | 'strong' | 'glow'
      };
    }
    
    onApplyChanges(Array.from(selectedIndices), changes);
  };

  const applyTransition = () => {
    if (transition) {
      const changes: Partial<Slide> = {
        transitionType: transition as any
      };
      onApplyChanges(Array.from(selectedIndices), changes);
    }
  };

  if (selectedCount === 0) {
    return (
      <div className="bulk-edit-panel bulk-edit-panel--empty">
        <p>Select slides to edit them in bulk</p>
      </div>
    );
  }

  return (
    <div className="bulk-edit-panel">
      <div className="bulk-edit-panel__header">
        <h3>
          <Layers size={16} />
          Bulk Edit ({selectedCount} slides)
        </h3>
        <button className="close-btn" onClick={onClose}>
          <X size={16} />
        </button>
      </div>

      <div className="bulk-edit-panel__content">
        {/* Quick Actions */}
        <div className="bulk-edit-section">
          <h4>Quick Actions</h4>
          <div className="bulk-actions">
            <button
              className="bulk-action-btn"
              onClick={onDuplicateSelected}
              title="Duplicate selected slides"
            >
              <Copy size={16} />
              <span>Duplicate</span>
            </button>
            <button
              className="bulk-action-btn"
              onClick={onToggleVisibilitySelected}
              title="Toggle visibility"
            >
              <Eye size={16} />
              <span>Toggle Visibility</span>
            </button>
            <button
              className="bulk-action-btn bulk-action-btn--danger"
              onClick={onDeleteSelected}
              title="Delete selected slides"
            >
              <Trash2 size={16} />
              <span>Delete</span>
            </button>
          </div>
        </div>

        {/* Background Colors */}
        <div className="bulk-edit-section">
          <h4>
            <Palette size={14} />
            Background Style
          </h4>
          
          <div className="form-group">
            <label>Solid Color</label>
            <div className="color-input-group">
              <input
                type="color"
                value={backgroundColor || '#ffffff'}
                onChange={(e) => setBackgroundColor(e.target.value)}
              />
              <input
                type="text"
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
                placeholder="#ffffff"
              />
            </div>
          </div>

          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={gradientEnabled}
                onChange={(e) => setGradientEnabled(e.target.checked)}
              />
              Enable Gradient
            </label>
          </div>

          {gradientEnabled && (
            <div className="gradient-controls">
              <div className="gradient-colors">
                <div className="color-input-group">
                  <label>Start</label>
                  <input
                    type="color"
                    value={gradientStart}
                    onChange={(e) => setGradientStart(e.target.value)}
                  />
                </div>
                <div className="color-input-group">
                  <label>End</label>
                  <input
                    type="color"
                    value={gradientEnd}
                    onChange={(e) => setGradientEnd(e.target.value)}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Angle: {gradientAngle}°</label>
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={gradientAngle}
                  onChange={(e) => setGradientAngle(parseInt(e.target.value))}
                />
              </div>
            </div>
          )}
          
          <button className="apply-btn" onClick={applyColors}>
            <Check size={14} />
            Apply Colors
          </button>
        </div>

        {/* Text Styles */}
        <div className="bulk-edit-section">
          <h4>
            <Type size={14} />
            Text Styles
          </h4>
          
          <div className="form-group">
            <label>Text Color</label>
            <div className="color-input-group">
              <input
                type="color"
                value={textColor || '#000000'}
                onChange={(e) => setTextColor(e.target.value)}
              />
              <input
                type="text"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
                placeholder="#000000"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Font Size</label>
            <select
              value={fontSize}
              onChange={(e) => setFontSize(e.target.value)}
            >
              <option value="">Default</option>
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
              <option value="x-large">Extra Large</option>
            </select>
          </div>

          <div className="form-group">
            <label>Font Weight</label>
            <select
              value={fontWeight}
              onChange={(e) => setFontWeight(e.target.value)}
            >
              <option value="">Default</option>
              <option value="300">Light</option>
              <option value="400">Regular</option>
              <option value="500">Medium</option>
              <option value="600">Semi Bold</option>
              <option value="700">Bold</option>
              <option value="900">Black</option>
            </select>
          </div>

          <div className="form-group">
            <label>Text Shadow</label>
            <select
              value={textShadow}
              onChange={(e) => setTextShadow(e.target.value)}
            >
              <option value="">None</option>
              <option value="subtle">Subtle</option>
              <option value="medium">Medium</option>
              <option value="strong">Strong</option>
              <option value="glow">Glow</option>
            </select>
          </div>
          
          <button className="apply-btn" onClick={applyTextStyles}>
            <Check size={14} />
            Apply Text Styles
          </button>
        </div>

        {/* Transitions */}
        <div className="bulk-edit-section">
          <h4>
            <Settings size={14} />
            Transition Effect
          </h4>
          
          <div className="form-group">
            <select
              value={transition}
              onChange={(e) => setTransition(e.target.value)}
            >
              <option value="">Keep Current</option>
              <option value="none">None</option>
              <option value="fade">Fade</option>
              <option value="slide">Slide</option>
              <option value="zoom">Zoom</option>
              <option value="flip">Flip</option>
              <option value="cube">Cube</option>
            </select>
          </div>
          
          <button className="apply-btn" onClick={applyTransition}>
            <Check size={14} />
            Apply Transition
          </button>
        </div>

        {/* Selected Slides Preview */}
        <div className="bulk-edit-section">
          <h4>Selected Slides</h4>
          <div className="selected-slides-list">
            {selectedSlides.map((slide, idx) => (
              <div key={slide.id} className="selected-slide-chip">
                <span>#{Array.from(selectedIndices)[idx] + 1}</span>
                <span>{slide.title || 'Untitled'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkEditPanel;