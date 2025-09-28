/**
 * SlideConditional - Conditional slide display logic
 * Phase 4: Advanced features
 */

import React, { useState, useEffect } from 'react';
import { 
  Eye, 
  EyeOff, 
  Calendar, 
  Clock, 
  Monitor,
  Smartphone,
  Globe,
  User,
  Filter,
  ChevronDown,
  Plus,
  X,
  AlertCircle
} from 'lucide-react';

export type ConditionType = 
  | 'always' 
  | 'date-range' 
  | 'time-range' 
  | 'device-type' 
  | 'screen-size' 
  | 'user-role'
  | 'language'
  | 'custom';

export interface SlideCondition {
  id: string;
  type: ConditionType;
  operator: 'is' | 'is-not' | 'greater-than' | 'less-than' | 'between' | 'contains';
  value: any;
  logic?: 'and' | 'or';
}

export interface ConditionalConfig {
  enabled: boolean;
  conditions: SlideCondition[];
  fallbackSlideId?: string;
  hideWhenFalse?: boolean;
}

interface SlideConditionalProps {
  config: ConditionalConfig;
  onChange: (config: ConditionalConfig) => void;
  slideId: string;
  availableSlides?: Array<{ id: string; title?: string }>;
}

export const SlideConditional: React.FC<SlideConditionalProps> = ({
  config,
  onChange,
  slideId,
  availableSlides = []
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [newConditionType, setNewConditionType] = useState<ConditionType>('date-range');

  const handleToggleEnabled = () => {
    onChange({
      ...config,
      enabled: !config.enabled
    });
  };

  const handleAddCondition = () => {
    const newCondition: SlideCondition = {
      id: `condition-${Date.now()}`,
      type: newConditionType,
      operator: 'is',
      value: getDefaultValue(newConditionType),
      logic: config.conditions.length > 0 ? 'and' : undefined
    };

    onChange({
      ...config,
      conditions: [...config.conditions, newCondition]
    });
  };

  const handleUpdateCondition = (conditionId: string, updates: Partial<SlideCondition>) => {
    onChange({
      ...config,
      conditions: config.conditions.map(c => 
        c.id === conditionId ? { ...c, ...updates } : c
      )
    });
  };

  const handleRemoveCondition = (conditionId: string) => {
    const newConditions = config.conditions.filter(c => c.id !== conditionId);
    
    // Reset logic for first condition
    if (newConditions.length > 0 && newConditions[0].logic) {
      newConditions[0] = { ...newConditions[0], logic: undefined };
    }

    onChange({
      ...config,
      conditions: newConditions
    });
  };

  const getDefaultValue = (type: ConditionType): any => {
    switch (type) {
      case 'date-range':
        return { 
          start: new Date().toISOString().split('T')[0], 
          end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] 
        };
      case 'time-range':
        return { start: '09:00', end: '17:00' };
      case 'device-type':
        return ['desktop'];
      case 'screen-size':
        return { min: 768, max: 1920 };
      case 'user-role':
        return ['visitor'];
      case 'language':
        return ['en'];
      case 'custom':
        return { key: '', value: '' };
      default:
        return null;
    }
  };

  const getConditionIcon = (type: ConditionType) => {
    switch (type) {
      case 'date-range': return <Calendar size={14} />;
      case 'time-range': return <Clock size={14} />;
      case 'device-type': return <Monitor size={14} />;
      case 'screen-size': return <Smartphone size={14} />;
      case 'user-role': return <User size={14} />;
      case 'language': return <Globe size={14} />;
      default: return <Filter size={14} />;
    }
  };

  const renderConditionValue = (condition: SlideCondition) => {
    switch (condition.type) {
      case 'date-range':
        return (
          <div className="condition-value date-range">
            <input
              type="date"
              value={condition.value?.start || ''}
              onChange={(e) => handleUpdateCondition(condition.id, {
                value: { ...condition.value, start: e.target.value }
              })}
              className="form-input"
            />
            <span>to</span>
            <input
              type="date"
              value={condition.value?.end || ''}
              onChange={(e) => handleUpdateCondition(condition.id, {
                value: { ...condition.value, end: e.target.value }
              })}
              className="form-input"
            />
          </div>
        );

      case 'time-range':
        return (
          <div className="condition-value time-range">
            <input
              type="time"
              value={condition.value?.start || ''}
              onChange={(e) => handleUpdateCondition(condition.id, {
                value: { ...condition.value, start: e.target.value }
              })}
              className="form-input"
            />
            <span>to</span>
            <input
              type="time"
              value={condition.value?.end || ''}
              onChange={(e) => handleUpdateCondition(condition.id, {
                value: { ...condition.value, end: e.target.value }
              })}
              className="form-input"
            />
          </div>
        );

      case 'device-type':
        return (
          <div className="condition-value device-type">
            {['desktop', 'tablet', 'mobile'].map(device => (
              <label key={device} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={condition.value?.includes(device)}
                  onChange={(e) => {
                    const devices = condition.value || [];
                    const newDevices = e.target.checked
                      ? [...devices, device]
                      : devices.filter((d: string) => d !== device);
                    handleUpdateCondition(condition.id, { value: newDevices });
                  }}
                />
                {device}
              </label>
            ))}
          </div>
        );

      case 'screen-size':
        return (
          <div className="condition-value screen-size">
            <div className="input-group">
              <label>Min Width</label>
              <input
                type="number"
                value={condition.value?.min || 0}
                onChange={(e) => handleUpdateCondition(condition.id, {
                  value: { ...condition.value, min: parseInt(e.target.value) }
                })}
                className="form-input"
              />
              <span>px</span>
            </div>
            <div className="input-group">
              <label>Max Width</label>
              <input
                type="number"
                value={condition.value?.max || 1920}
                onChange={(e) => handleUpdateCondition(condition.id, {
                  value: { ...condition.value, max: parseInt(e.target.value) }
                })}
                className="form-input"
              />
              <span>px</span>
            </div>
          </div>
        );

      case 'user-role':
        return (
          <div className="condition-value user-role">
            {['visitor', 'member', 'admin'].map(role => (
              <label key={role} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={condition.value?.includes(role)}
                  onChange={(e) => {
                    const roles = condition.value || [];
                    const newRoles = e.target.checked
                      ? [...roles, role]
                      : roles.filter((r: string) => r !== role);
                    handleUpdateCondition(condition.id, { value: newRoles });
                  }}
                />
                {role}
              </label>
            ))}
          </div>
        );

      case 'language':
        return (
          <div className="condition-value language">
            <select
              multiple
              value={condition.value || []}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, option => option.value);
                handleUpdateCondition(condition.id, { value: selected });
              }}
              className="form-select"
            >
              <option value="en">English</option>
              <option value="ko">한국어</option>
              <option value="ja">日本語</option>
              <option value="zh">中文</option>
              <option value="es">Español</option>
            </select>
          </div>
        );

      case 'custom':
        return (
          <div className="condition-value custom">
            <input
              type="text"
              placeholder="Key"
              value={condition.value?.key || ''}
              onChange={(e) => handleUpdateCondition(condition.id, {
                value: { ...condition.value, key: e.target.value }
              })}
              className="form-input"
            />
            <select
              value={condition.operator}
              onChange={(e) => handleUpdateCondition(condition.id, {
                operator: e.target.value as any
              })}
              className="form-select"
            >
              <option value="is">Is</option>
              <option value="is-not">Is Not</option>
              <option value="contains">Contains</option>
            </select>
            <input
              type="text"
              placeholder="Value"
              value={condition.value?.value || ''}
              onChange={(e) => handleUpdateCondition(condition.id, {
                value: { ...condition.value, value: e.target.value }
              })}
              className="form-input"
            />
          </div>
        );

      default:
        return null;
    }
  };

  const evaluateConditions = (): boolean => {
    if (!config.enabled || config.conditions.length === 0) return true;

    // This would be evaluated on the client side with actual runtime data
    // For now, we'll just show the UI
    return true;
  };

  const isVisible = evaluateConditions();

  return (
    <div className="slide-conditional">
      <div className="conditional-header">
        <button
          className="conditional-toggle"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {config.enabled ? <Eye size={16} /> : <EyeOff size={16} />}
          <span>Conditional Display</span>
          <span className={`status ${config.enabled ? 'enabled' : 'disabled'}`}>
            {config.enabled ? 'Enabled' : 'Disabled'}
          </span>
          <ChevronDown 
            size={14} 
            className={`chevron ${isExpanded ? 'expanded' : ''}`} 
          />
        </button>
        
        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={handleToggleEnabled}
          />
          <span className="toggle-slider" />
        </label>
      </div>

      {isExpanded && (
        <div className="conditional-content">
          {config.enabled && (
            <>
              {/* Conditions List */}
              <div className="conditions-list">
                {config.conditions.map((condition, index) => (
                  <div key={condition.id} className="condition-item">
                    {index > 0 && (
                      <div className="condition-logic">
                        <select
                          value={condition.logic || 'and'}
                          onChange={(e) => handleUpdateCondition(condition.id, {
                            logic: e.target.value as 'and' | 'or'
                          })}
                          className="logic-select"
                        >
                          <option value="and">AND</option>
                          <option value="or">OR</option>
                        </select>
                      </div>
                    )}
                    
                    <div className="condition-content">
                      <div className="condition-header">
                        <div className="condition-type">
                          {getConditionIcon(condition.type)}
                          <select
                            value={condition.type}
                            onChange={(e) => handleUpdateCondition(condition.id, {
                              type: e.target.value as ConditionType,
                              value: getDefaultValue(e.target.value as ConditionType)
                            })}
                            className="form-select"
                          >
                            <option value="date-range">Date Range</option>
                            <option value="time-range">Time Range</option>
                            <option value="device-type">Device Type</option>
                            <option value="screen-size">Screen Size</option>
                            <option value="user-role">User Role</option>
                            <option value="language">Language</option>
                            <option value="custom">Custom</option>
                          </select>
                        </div>
                        
                        <button
                          className="btn-icon btn-danger"
                          onClick={() => handleRemoveCondition(condition.id)}
                        >
                          <X size={14} />
                        </button>
                      </div>
                      
                      {renderConditionValue(condition)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Condition Button */}
              <div className="add-condition">
                <select
                  value={newConditionType}
                  onChange={(e) => setNewConditionType(e.target.value as ConditionType)}
                  className="form-select"
                >
                  <option value="date-range">Date Range</option>
                  <option value="time-range">Time Range</option>
                  <option value="device-type">Device Type</option>
                  <option value="screen-size">Screen Size</option>
                  <option value="user-role">User Role</option>
                  <option value="language">Language</option>
                  <option value="custom">Custom</option>
                </select>
                <button
                  className="btn btn-primary"
                  onClick={handleAddCondition}
                >
                  <Plus size={14} />
                  Add Condition
                </button>
              </div>

              {/* Fallback Options */}
              <div className="fallback-options">
                <h4>When conditions are not met:</h4>
                <label className="radio-label">
                  <input
                    type="radio"
                    checked={config.hideWhenFalse !== false}
                    onChange={() => onChange({ ...config, hideWhenFalse: true })}
                  />
                  Hide this slide
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    checked={config.hideWhenFalse === false}
                    onChange={() => onChange({ ...config, hideWhenFalse: false })}
                  />
                  Show fallback slide
                </label>
                
                {config.hideWhenFalse === false && (
                  <select
                    value={config.fallbackSlideId || ''}
                    onChange={(e) => onChange({ ...config, fallbackSlideId: e.target.value })}
                    className="form-select"
                  >
                    <option value="">Select fallback slide...</option>
                    {availableSlides
                      .filter(s => s.id !== slideId)
                      .map(slide => (
                        <option key={slide.id} value={slide.id}>
                          {slide.title || `Slide ${slide.id}`}
                        </option>
                      ))}
                  </select>
                )}
              </div>

              {/* Preview Status */}
              <div className="condition-preview">
                <AlertCircle size={14} />
                <span>
                  Current Status: {isVisible ? 'Visible' : 'Hidden'}
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

// Helper function to evaluate conditions at runtime
export const evaluateSlideConditions = (
  config: ConditionalConfig,
  context: {
    currentDate?: Date;
    currentTime?: string;
    deviceType?: string;
    screenWidth?: number;
    userRole?: string;
    language?: string;
    customData?: Record<string, any>;
  }
): boolean => {
  if (!config.enabled || config.conditions.length === 0) return true;

  let result = false;
  let lastLogic: 'and' | 'or' | undefined = undefined;

  for (let i = 0; i < config.conditions.length; i++) {
    const condition = config.conditions[i];
    let conditionMet = false;

    switch (condition.type) {
      case 'date-range':
        if (context.currentDate && condition.value) {
          const current = context.currentDate.getTime();
          const start = new Date(condition.value.start).getTime();
          const end = new Date(condition.value.end).getTime();
          conditionMet = current >= start && current <= end;
        }
        break;

      case 'device-type':
        if (context.deviceType && condition.value) {
          conditionMet = condition.value.includes(context.deviceType);
        }
        break;

      case 'screen-size':
        if (context.screenWidth !== undefined && condition.value) {
          conditionMet = context.screenWidth >= condition.value.min && 
                        context.screenWidth <= condition.value.max;
        }
        break;

      case 'user-role':
        if (context.userRole && condition.value) {
          conditionMet = condition.value.includes(context.userRole);
        }
        break;

      case 'language':
        if (context.language && condition.value) {
          conditionMet = condition.value.includes(context.language);
        }
        break;

      case 'custom':
        if (context.customData && condition.value) {
          const actualValue = context.customData[condition.value.key];
          switch (condition.operator) {
            case 'is':
              conditionMet = actualValue === condition.value.value;
              break;
            case 'is-not':
              conditionMet = actualValue !== condition.value.value;
              break;
            case 'contains':
              conditionMet = String(actualValue).includes(condition.value.value);
              break;
          }
        }
        break;

      default:
        conditionMet = true;
    }

    if (i === 0) {
      result = conditionMet;
    } else {
      if (lastLogic === 'and') {
        result = result && conditionMet;
      } else if (lastLogic === 'or') {
        result = result || conditionMet;
      }
    }

    lastLogic = condition.logic;
  }

  return result;
};

export default SlideConditional;