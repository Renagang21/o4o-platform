import React, { useState, useCallback, useMemo } from 'react';
import { 
  FooterBuilderLayout, 
  FooterWidgetType, 
  FooterDashboardWidgetConfig 
} from '../types/customizer-types';
import { 
  Type, 
  Menu, 
  Share2, 
  MapPin, 
  Copyright,
  Code,
  FileText,
  Mail,
  Plus,
  X,
  Settings,
  Columns2,
  Columns3
} from 'lucide-react';

interface FooterBuilderProps {
  layout: FooterBuilderLayout;
  onChange: (layout: FooterBuilderLayout) => void;
  device: 'desktop' | 'tablet' | 'mobile';
}

// 사용 가능한 위젯 정의
const AVAILABLE_WIDGETS: { type: FooterWidgetType; label: string; icon: React.ReactNode }[] = [
  { type: 'text', label: 'Text', icon: <Type size={16} /> },
  { type: 'menu', label: 'Menu', icon: <Menu size={16} /> },
  { type: 'social', label: 'Social Icons', icon: <Share2 size={16} /> },
  { type: 'contact', label: 'Contact Info', icon: <MapPin size={16} /> },
  { type: 'copyright', label: 'Copyright', icon: <Copyright size={16} /> },
  { type: 'html', label: 'HTML', icon: <Code size={16} /> },
  { type: 'recent-posts', label: 'Recent Posts', icon: <FileText size={16} /> },
  { type: 'newsletter', label: 'Newsletter', icon: <Mail size={16} /> },
];

export const FooterBuilder: React.FC<FooterBuilderProps> = React.memo(({
  layout,
  onChange,
  device
}) => {
  const [selectedWidget, setSelectedWidget] = useState<FooterDashboardWidgetConfig | null>(null);
  const [showWidgetSelector, setShowWidgetSelector] = useState<{
    section: 'widgets' | 'bar';
    column?: number;
    position?: 'left' | 'right';
  } | null>(null);

  // 위젯 추가
  const addWidget = useCallback((
    section: 'widgets' | 'bar',
    widgetType: FooterWidgetType,
    column?: number,
    position?: 'left' | 'right'
  ) => {
    const newWidget: FooterDashboardWidgetConfig = {
      id: `${widgetType}-${Date.now()}`,
      type: widgetType,
      label: AVAILABLE_WIDGETS.find(w => w.type === widgetType)?.label,
      settings: {
        title: AVAILABLE_WIDGETS.find(w => w.type === widgetType)?.label
      }
    };

    const newLayout = { ...layout };
    
    if (section === 'widgets' && column !== undefined) {
      // Ensure the column exists
      if (!newLayout.widgets.layout[column]) {
        newLayout.widgets.layout[column] = [];
      }
      newLayout.widgets.layout[column].push(newWidget);
    } else if (section === 'bar' && position) {
      newLayout.bar[position].push(newWidget);
    }
    
    onChange(newLayout);
    setShowWidgetSelector(null);
  }, [layout, onChange]);

  // 위젯 제거
  const removeWidget = useCallback((
    section: 'widgets' | 'bar',
    widgetId: string,
    column?: number,
    position?: 'left' | 'right'
  ) => {
    const newLayout = { ...layout };
    
    if (section === 'widgets' && column !== undefined) {
      newLayout.widgets.layout[column] = newLayout.widgets.layout[column].filter(w => w.id !== widgetId);
    } else if (section === 'bar' && position) {
      newLayout.bar[position] = newLayout.bar[position].filter(w => w.id !== widgetId);
    }
    
    onChange(newLayout);
  }, [layout, onChange]);

  // 컬럼 수 변경
  const changeColumns = useCallback((columns: 1 | 2 | 3 | 4 | 5) => {
    const newLayout = { ...layout };
    newLayout.widgets.columns = columns;
    
    // Adjust layout array
    const currentLength = newLayout.widgets.layout.length;
    if (columns > currentLength) {
      // Add empty columns
      for (let i = currentLength; i < columns; i++) {
        newLayout.widgets.layout.push([]);
      }
    } else if (columns < currentLength) {
      // Merge extra columns into last column
      const extraWidgets = newLayout.widgets.layout.slice(columns).flat();
      newLayout.widgets.layout = newLayout.widgets.layout.slice(0, columns);
      if (newLayout.widgets.layout.length > 0) {
        newLayout.widgets.layout[columns - 1].push(...extraWidgets);
      }
    }
    
    onChange(newLayout);
  }, [layout, onChange]);

  // 섹션 토글
  const toggleSection = useCallback((section: 'widgets' | 'bar') => {
    const newLayout = { ...layout };
    newLayout[section].enabled = !newLayout[section].enabled;
    onChange(newLayout);
  }, [layout, onChange]);

  // 컬럼 아이콘 가져오기
  const getColumnsIcon = (columns: number) => {
    switch (columns) {
      case 1: return '▬';
      case 2: return '▬ ▬';
      case 3: return '▬ ▬ ▬';
      case 4: return '▬ ▬ ▬ ▬';
      case 5: return '▬ ▬ ▬ ▬ ▬';
      default: return '▬';
    }
  };

  return (
    <div className="footer-builder">
      {/* Footer Widgets Section */}
      <div className={`footer-builder-section ${!layout.widgets.enabled ? 'disabled' : ''}`}>
        <div className="section-header">
          <div className="section-title">Footer Widgets</div>
          <div className="section-controls">
            <select 
              value={layout.widgets.columns}
              onChange={(e) => changeColumns(Number(e.target.value) as 1 | 2 | 3 | 4 | 5)}
              disabled={!layout.widgets.enabled}
              className="column-selector"
            >
              <option value="1">1 Column</option>
              <option value="2">2 Columns</option>
              <option value="3">3 Columns</option>
              <option value="4">4 Columns</option>
              <option value="5">5 Columns</option>
            </select>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={layout.widgets.enabled}
                onChange={() => toggleSection('widgets')}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>

        {layout.widgets.enabled && (
          <div className="widgets-columns" style={{ gridTemplateColumns: `repeat(${layout.widgets.columns}, 1fr)` }}>
            {Array.from({ length: layout.widgets.columns }, (_, i) => (
              <div key={i} className="widget-column">
                <div className="column-header">Column {i + 1}</div>
                <div className="column-content">
                  {(layout.widgets.layout[i] || []).map((widget) => (
                    <div key={widget.id} className="widget-item">
                      <span className="widget-icon">
                        {AVAILABLE_WIDGETS.find(w => w.type === widget.type)?.icon}
                      </span>
                      <div className="widget-info">
                        <span className="widget-label">{widget.label}</span>
                        {widget.settings.title && (
                          <span className="widget-title">{widget.settings.title}</span>
                        )}
                      </div>
                      <button
                        className="widget-remove"
                        onClick={() => removeWidget('widgets', widget.id, i)}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  <button
                    className="add-widget-btn"
                    onClick={() => setShowWidgetSelector({ section: 'widgets', column: i })}
                  >
                    <Plus size={14} /> Add Widget
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Bar Section */}
      <div className={`footer-builder-section ${!layout.bar.enabled ? 'disabled' : ''}`}>
        <div className="section-header">
          <div className="section-title">Footer Bar</div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={layout.bar.enabled}
              onChange={() => toggleSection('bar')}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>

        {layout.bar.enabled && (
          <div className="bar-columns">
            <div className="bar-column">
              <div className="column-header">Left Section</div>
              <div className="column-content">
                {layout.bar.left.map((widget) => (
                  <div key={widget.id} className="widget-item">
                    <span className="widget-icon">
                      {AVAILABLE_WIDGETS.find(w => w.type === widget.type)?.icon}
                    </span>
                    <span className="widget-label">{widget.label}</span>
                    <button
                      className="widget-remove"
                      onClick={() => removeWidget('bar', widget.id, undefined, 'left')}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
                <button
                  className="add-widget-btn"
                  onClick={() => setShowWidgetSelector({ section: 'bar', position: 'left' })}
                >
                  <Plus size={14} /> Add Widget
                </button>
              </div>
            </div>

            <div className="bar-column">
              <div className="column-header">Right Section</div>
              <div className="column-content">
                {layout.bar.right.map((widget) => (
                  <div key={widget.id} className="widget-item">
                    <span className="widget-icon">
                      {AVAILABLE_WIDGETS.find(w => w.type === widget.type)?.icon}
                    </span>
                    <span className="widget-label">{widget.label}</span>
                    <button
                      className="widget-remove"
                      onClick={() => removeWidget('bar', widget.id, undefined, 'right')}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
                <button
                  className="add-widget-btn"
                  onClick={() => setShowWidgetSelector({ section: 'bar', position: 'right' })}
                >
                  <Plus size={14} /> Add Widget
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Widget Selector Modal */}
      {showWidgetSelector && (
        <div className="widget-selector-overlay" onClick={() => setShowWidgetSelector(null)}>
          <div className="widget-selector-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Select a Widget</h3>
              <button onClick={() => setShowWidgetSelector(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-content">
              <div className="widgets-grid">
                {AVAILABLE_WIDGETS.map(widget => (
                  <button
                    key={widget.type}
                    className="widget-option"
                    onClick={() => addWidget(
                      showWidgetSelector.section,
                      widget.type,
                      showWidgetSelector.column,
                      showWidgetSelector.position
                    )}
                  >
                    <div className="widget-option-icon">{widget.icon}</div>
                    <div className="widget-option-label">{widget.label}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .footer-builder {
          padding: 20px;
        }

        .footer-builder-section {
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          margin-bottom: 20px;
          overflow: hidden;
        }

        .footer-builder-section.disabled {
          opacity: 0.5;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: #f5f5f5;
        }

        .section-title {
          font-weight: 600;
          font-size: 14px;
        }

        .section-controls {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .column-selector {
          padding: 4px 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 13px;
        }

        .toggle-switch {
          position: relative;
          display: inline-block;
          width: 44px;
          height: 24px;
        }

        .toggle-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .toggle-slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #ccc;
          transition: .4s;
          border-radius: 24px;
        }

        .toggle-switch input:checked + .toggle-slider {
          background-color: #2196F3;
        }

        .toggle-slider:before {
          position: absolute;
          content: "";
          height: 18px;
          width: 18px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: .4s;
          border-radius: 50%;
        }

        .toggle-switch input:checked + .toggle-slider:before {
          transform: translateX(20px);
        }

        .widgets-columns {
          display: grid;
          gap: 1px;
          background: #e0e0e0;
        }

        .bar-columns {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1px;
          background: #e0e0e0;
        }

        .widget-column,
        .bar-column {
          background: white;
        }

        .column-header {
          padding: 8px 12px;
          background: #fafafa;
          font-size: 12px;
          font-weight: 500;
          text-transform: uppercase;
          color: #666;
          border-bottom: 1px solid #e0e0e0;
        }

        .column-content {
          min-height: 100px;
          padding: 12px;
        }

        .widget-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px;
          margin-bottom: 8px;
          background: #f8f9fa;
          border: 1px solid #dee2e6;
          border-radius: 4px;
        }

        .widget-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          color: #666;
        }

        .widget-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .widget-label {
          font-size: 13px;
          font-weight: 500;
        }

        .widget-title {
          font-size: 11px;
          color: #999;
        }

        .widget-remove {
          background: none;
          border: none;
          color: #999;
          cursor: pointer;
          padding: 4px;
        }

        .widget-remove:hover {
          color: #e74c3c;
        }

        .add-widget-btn {
          width: 100%;
          padding: 8px;
          border: 2px dashed #dee2e6;
          border-radius: 4px;
          background: transparent;
          color: #666;
          font-size: 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          transition: all 0.2s;
        }

        .add-widget-btn:hover {
          border-color: #2196F3;
          color: #2196F3;
          background: #f0f8ff;
        }

        .widget-selector-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .widget-selector-modal {
          background: white;
          border-radius: 8px;
          width: 90%;
          max-width: 600px;
          max-height: 80vh;
          overflow: hidden;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid #e0e0e0;
        }

        .modal-header h3 {
          margin: 0;
          font-size: 18px;
        }

        .modal-header button {
          background: none;
          border: none;
          color: #666;
          cursor: pointer;
        }

        .modal-content {
          padding: 20px;
          overflow-y: auto;
          max-height: calc(80vh - 60px);
        }

        .widgets-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
          gap: 12px;
        }

        .widget-option {
          padding: 16px;
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          background: white;
          cursor: pointer;
          transition: all 0.2s;
          text-align: center;
        }

        .widget-option:hover {
          border-color: #2196F3;
          background: #f0f8ff;
        }

        .widget-option-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 8px;
          color: #666;
        }

        .widget-option-label {
          font-size: 12px;
          color: #333;
        }
      `}</style>
    </div>
  );
});

FooterBuilder.displayName = 'FooterBuilder';