import { useState } from 'react';
import { Palette, Moon, Sun, Layout, Type, Zap } from 'lucide-react';
import DraggableWidget, { WidgetContainer } from '@/components/DraggableWidget';
import { InlineEdit } from '@/components/InlineEdit';
import { ScreenOptions, ScreenOption } from '@/components/ScreenOptions';
import { useTheme } from '@/contexts/ThemeContext';

const UIShowcase = () => {
  const { theme, toggleTheme } = useTheme();
  const [widgets, setWidgets] = useState([
    { id: 'colors', title: 'Modern Color Palette', order: 0 },
    { id: 'components', title: 'Component Examples', order: 1 },
    { id: 'inline', title: 'Inline Editing', order: 2 },
    { id: 'theme', title: 'Theme System', order: 3 },
  ]);

  const [screenOptions, setScreenOptions] = useState([
    { id: 'colors', label: 'Color Palette', checked: true },
    { id: 'components', label: 'Components', checked: true },
    { id: 'inline', label: 'Inline Editing', checked: true },
    { id: 'theme', label: 'Theme Demo', checked: true },
  ]);

  const [columns, setColumns] = useState(2);
  const [inlineValues, setInlineValues] = useState({
    title: 'Modern WordPress Admin',
    subtitle: 'With advanced UI/UX features',
    price: '99.99',
  });

  const handleReorder = (fromIndex: number, toIndex: number) => {
    const newWidgets = [...widgets];
    const [movedWidget] = newWidgets.splice(fromIndex, 1);
    newWidgets.splice(toIndex, 0, movedWidget);
    setWidgets(newWidgets.map((w, i) => ({ ...w, order: i })));
  };

  const handleOptionChange = (id: string, checked: boolean) => {
    setScreenOptions(prev =>
      prev.map(opt => (opt.id === id ? { ...opt, checked } : opt))
    );
  };

  const visibleWidgets = widgets
    .filter(w => screenOptions.find(opt => opt.id === w.id)?.checked)
    .sort((a, b) => a.order - b.order);

  const colorPalette = [
    { name: 'Primary', var: '--modern-primary', class: 'bg-modern-primary' },
    { name: 'Secondary', var: '--modern-secondary', class: 'bg-modern-secondary' },
    { name: 'Success', var: '--modern-success', class: 'bg-modern-success' },
    { name: 'Warning', var: '--modern-warning', class: 'bg-modern-warning' },
    { name: 'Danger', var: '--modern-danger', class: 'bg-modern-danger' },
    { name: 'Accent', var: '--modern-accent', class: 'bg-modern-accent' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-modern-text-primary flex items-center gap-2">
            <Palette className="w-8 h-8 text-modern-primary" />
            UI/UX Showcase
          </h1>
          <p className="text-modern-text-secondary mt-1">
            Modern WordPress-style admin interface with advanced features
          </p>
        </div>
        <ScreenOptions
          options={screenOptions}
          onOptionChange={handleOptionChange}
          columns={columns}
          onColumnsChange={setColumns}
        />
      </div>

      {/* Draggable Widgets */}
      <WidgetContainer onReorder={handleReorder} columns={columns}>
        {visibleWidgets.map((widget: any) => {
          switch (widget.id) {
            case 'colors':
              return (
                <DraggableWidget
                  key={widget.id}
                  id={widget.id}
                  title={widget.title}
                  isCollapsible
                  isClosable
                  onClose={(id) => handleOptionChange(id, false)}
                >
                  <div className="space-y-4">
                    <p className="text-sm text-modern-text-secondary">
                      Modern color system with CSS variables for easy theming
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      {colorPalette.map((color: any) => (
                        <div key={color.name} className="space-y-2">
                          <div className={`h-20 rounded-lg ${color.class} shadow-md`} />
                          <div>
                            <p className="font-medium text-modern-text-primary">{color.name}</p>
                            <code className="text-xs text-modern-text-secondary">{color.var}</code>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="p-4 bg-gradient-to-r from-modern-primary to-modern-secondary rounded-lg text-white">
                      <p className="font-semibold">Gradient Support</p>
                      <p className="text-sm opacity-90">Beautiful gradients for modern UI</p>
                    </div>
                  </div>
                </DraggableWidget>
              );

            case 'components':
              return (
                <DraggableWidget
                  key={widget.id}
                  id={widget.id}
                  title={widget.title}
                  isCollapsible
                  isClosable
                  onClose={(id) => handleOptionChange(id, false)}
                >
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <h4 className="font-medium text-modern-text-primary">Buttons</h4>
                      <div className="flex flex-wrap gap-2">
                        <button className="modern-btn-primary">Primary</button>
                        <button className="modern-btn-secondary">Secondary</button>
                        <button className="modern-btn-outline">Outline</button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-medium text-modern-text-primary">Badges</h4>
                      <div className="flex flex-wrap gap-2">
                        <span className="modern-badge-primary">Primary</span>
                        <span className="modern-badge-success">Success</span>
                        <span className="modern-badge-warning">Warning</span>
                        <span className="modern-badge-error">Error</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-medium text-modern-text-primary">Input</h4>
                      <input
                        type="text"
                        placeholder="Modern input field"
                        className="modern-input w-full"
                      />
                    </div>

                    <div className="modern-glass p-4">
                      <p className="font-medium text-modern-text-primary">Glass Effect</p>
                      <p className="text-sm text-modern-text-secondary">
                        Modern glassmorphism design
                      </p>
                    </div>
                  </div>
                </DraggableWidget>
              );

            case 'inline':
              return (
                <DraggableWidget
                  key={widget.id}
                  id={widget.id}
                  title={widget.title}
                  isCollapsible
                  isClosable
                  onClose={(id) => handleOptionChange(id, false)}
                >
                  <div className="space-y-4">
                    <p className="text-sm text-modern-text-secondary">
                      Click on any text below to edit inline
                    </p>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-modern-text-secondary">Title</label>
                        <div className="text-lg font-semibold">
                          <InlineEdit
                            value={inlineValues.title}
                            onSave={(value) => setInlineValues(prev => ({ ...prev, title: value }))}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-modern-text-secondary">Subtitle</label>
                        <div>
                          <InlineEdit
                            value={inlineValues.subtitle}
                            onSave={(value) => setInlineValues(prev => ({ ...prev, subtitle: value }))}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-modern-text-secondary">Price</label>
                        <div className="text-2xl font-bold text-modern-primary">
                          $<InlineEdit
                            value={inlineValues.price}
                            onSave={(value) => setInlineValues(prev => ({ ...prev, price: value }))}
                            inputClassName="w-24"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </DraggableWidget>
              );

            case 'theme':
              return (
                <DraggableWidget
                  key={widget.id}
                  id={widget.id}
                  title={widget.title}
                  isCollapsible
                  isClosable
                  onClose={(id) => handleOptionChange(id, false)}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-modern-bg-tertiary rounded-lg">
                      <div className="flex items-center gap-3">
                        {theme === 'light' ? (
                          <Sun className="w-6 h-6 text-modern-warning" />
                        ) : (
                          <Moon className="w-6 h-6 text-modern-primary" />
                        )}
                        <div>
                          <p className="font-medium text-modern-text-primary">
                            {theme === 'light' ? 'Light Mode' : 'Dark Mode'}
                          </p>
                          <p className="text-sm text-modern-text-secondary">
                            Click to switch theme
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={toggleTheme}
                        className="px-4 py-2 bg-modern-primary text-white rounded-lg hover:bg-modern-primary-hover transition-colors"
                      >
                        Toggle
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-modern-bg-primary rounded-lg text-center">
                        <Layout className="w-8 h-8 mx-auto mb-2 text-modern-primary" />
                        <p className="text-sm font-medium text-modern-text-primary">Responsive</p>
                      </div>
                      <div className="p-3 bg-modern-bg-primary rounded-lg text-center">
                        <Type className="w-8 h-8 mx-auto mb-2 text-modern-secondary" />
                        <p className="text-sm font-medium text-modern-text-primary">Typography</p>
                      </div>
                      <div className="p-3 bg-modern-bg-primary rounded-lg text-center">
                        <Zap className="w-8 h-8 mx-auto mb-2 text-modern-warning" />
                        <p className="text-sm font-medium text-modern-text-primary">Fast</p>
                      </div>
                      <div className="p-3 bg-modern-bg-primary rounded-lg text-center">
                        <Palette className="w-8 h-8 mx-auto mb-2 text-modern-accent" />
                        <p className="text-sm font-medium text-modern-text-primary">Beautiful</p>
                      </div>
                    </div>
                  </div>
                </DraggableWidget>
              );

            default:
              return null;
          }
        })}
      </WidgetContainer>

      {/* Footer */}
      <div className="mt-8 p-6 bg-modern-bg-tertiary rounded-lg">
        <h3 className="text-lg font-semibold text-modern-text-primary mb-4">
          Key Features Implemented
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-modern-primary rounded-full mt-2" />
            <div>
              <p className="font-medium text-modern-text-primary">Modern Color System</p>
              <p className="text-sm text-modern-text-secondary">
                CSS variables with light/dark mode support
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-modern-secondary rounded-full mt-2" />
            <div>
              <p className="font-medium text-modern-text-primary">Drag & Drop Widgets</p>
              <p className="text-sm text-modern-text-secondary">
                Reorganize dashboard widgets easily
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-modern-success rounded-full mt-2" />
            <div>
              <p className="font-medium text-modern-text-primary">Screen Options</p>
              <p className="text-sm text-modern-text-secondary">
                WordPress-style visibility controls
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-modern-warning rounded-full mt-2" />
            <div>
              <p className="font-medium text-modern-text-primary">Inline Editing</p>
              <p className="text-sm text-modern-text-secondary">
                Edit content without page refresh
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UIShowcase;