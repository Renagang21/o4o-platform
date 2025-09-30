import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, Search } from 'lucide-react';
import { useCustomizer } from '../../context/CustomizerContext';
import { SettingSection } from '../../types/customizer-types';
import { EnhancedSearch } from '../EnhancedSearch';
import '../../styles/enhanced-search.css';

interface SidebarPanel {
  id: SettingSection;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children?: SidebarPanel[];
}

const panels: SidebarPanel[] = [
  {
    id: 'siteIdentity',
    title: 'Site Identity',
    description: 'Logo, Site Title & Tagline',
  },
  {
    id: 'colors',
    title: 'Global',
    children: [
      {
        id: 'colors',
        title: 'Colors',
        description: 'Base colors, Link colors, Background',
      },
      {
        id: 'typography',
        title: 'Typography',
        description: 'Body, Headings, Buttons',
      },
      {
        id: 'container',
        title: 'Container',
        description: 'Layout width and spacing',
      },
    ],
  },
  {
    id: 'header',
    title: 'Header',
    description: 'Site header layout and styling',
    children: [
      {
        id: 'header',
        title: 'Header Builder',
        description: 'Drag & drop header elements',
      },
    ],
  },
  {
    id: 'footer',
    title: 'Footer',
    description: 'Site footer layout and styling',
    children: [
      {
        id: 'footer',
        title: 'Footer Builder',
        description: 'Widgets and bottom bar',
      },
    ],
  },
  {
    id: 'sidebar',
    title: 'Sidebar',
    description: 'Sidebar layout and position',
  },
  {
    id: 'blog',
    title: 'Blog',
    description: 'Blog archive and single post settings',
  },
];

interface CustomizerSidebarProps {
  activePanel: string | null;
  onPanelSelect: (panelId: SettingSection) => void;
}

export const CustomizerSidebar: React.FC<CustomizerSidebarProps> = ({
  activePanel,
  onPanelSelect,
}) => {
  const { state, setActiveSection } = useCustomizer();
  const [expandedPanels, setExpandedPanels] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentView, setCurrentView] = useState<'main' | 'section'>('main');
  const [currentSection, setCurrentSection] = useState<SettingSection | null>(null);
  
  const togglePanel = (panelId: string) => {
    setExpandedPanels(prev =>
      prev.includes(panelId)
        ? prev.filter(id => id !== panelId)
        : [...prev, panelId]
    );
  };
  
  const handlePanelClick = (panel: SidebarPanel) => {
    if (panel.children && panel.children.length > 0) {
      togglePanel(panel.id);
    } else {
      setCurrentSection(panel.id);
      setCurrentView('section');
      setActiveSection(panel.id);
      onPanelSelect(panel.id);
    }
  };
  
  const handleBackClick = () => {
    setCurrentView('main');
    setCurrentSection(null);
    setActiveSection(null);
  };
  
  const filterPanels = (panels: SidebarPanel[]): SidebarPanel[] => {
    if (!searchQuery) return panels;
    
    return panels.filter(panel => {
      const matchesSearch = 
        panel.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        panel.description?.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (panel.children) {
        const filteredChildren = filterPanels(panel.children);
        return matchesSearch || filteredChildren.length > 0;
      }
      
      return matchesSearch;
    });
  };
  
  const filteredPanels = filterPanels(panels);
  
  const renderPanel = (panel: SidebarPanel, level: number = 0) => {
    const isExpanded = expandedPanels.includes(panel.id);
    const hasChildren = panel.children && panel.children.length > 0;
    const isActive = activePanel === panel.id;
    
    return (
      <div key={panel.id} className="wp-customizer-panel-wrapper">
        <div
          className={`wp-customizer-panel ${isActive ? 'active' : ''} level-${level}`}
          onClick={() => handlePanelClick(panel)}
          style={{ paddingLeft: `${20 + level * 15}px` }}
        >
          <div className="wp-customizer-panel-content">
            <h3 className="wp-customizer-panel-title">{panel.title}</h3>
            {panel.description && (
              <p className="wp-customizer-panel-description">{panel.description}</p>
            )}
          </div>
          {hasChildren && (
            <span className="wp-customizer-panel-arrow">
              {isExpanded ? <ChevronRight size={16} /> : <ChevronRight size={16} />}
            </span>
          )}
        </div>
        
        {hasChildren && isExpanded && (
          <div className="wp-customizer-subpanels">
            {Array.isArray(panel.children) && panel.children.map(child => renderPanel(child, level + 1))}
          </div>
        )}
      </div>
    );
  };
  
  if (currentView === 'section' && currentSection) {
    // Render section content
    const section = Array.isArray(panels) ? 
                   (panels.find(p => p.id === currentSection) || 
                    panels.flatMap(p => Array.isArray(p.children) ? p.children : [])
                          .find(c => c.id === currentSection)) : 
                   undefined;
    
    return (
      <div className="wp-customizer-sidebar">
        <div className="wp-customizer-section-header">
          <button
            onClick={handleBackClick}
            className="wp-customizer-back-button"
          >
            <ChevronLeft size={20} />
            <span>Customizing</span>
          </button>
          <h2>{section?.title}</h2>
        </div>
        
        <div className="wp-customizer-section-content">
          {/* Section content will be rendered by individual section components */}
          <div className="wp-customizer-section-placeholder">
            <p>Loading {section?.title} settings...</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="wp-customizer-sidebar">
      {/* Enhanced Search */}
      <EnhancedSearch
        onSelect={(sectionId) => {
          setCurrentSection(sectionId);
          setCurrentView('section');
          setActiveSection(sectionId);
          onPanelSelect(sectionId);
        }}
      />
      
      {/* Panels */}
      <div className="wp-customizer-panels">
        {Array.isArray(filteredPanels) && filteredPanels.length > 0 ? (
          filteredPanels.map(panel => renderPanel(panel))
        ) : (
          <div className="wp-customizer-no-results">
            <p>No options found for "{searchQuery}"</p>
          </div>
        )}
      </div>
      
      {/* Additional CSS Section */}
      <div className="wp-customizer-additional">
        <div
          className={`wp-customizer-panel ${activePanel === 'customCSS' ? 'active' : ''}`}
          onClick={() => {
            setCurrentSection('customCSS' as SettingSection);
            setCurrentView('section');
            setActiveSection('customCSS' as SettingSection);
            onPanelSelect('customCSS' as SettingSection);
          }}
        >
          <h3 className="wp-customizer-panel-title">Additional CSS</h3>
          <p className="wp-customizer-panel-description">
            Add your own custom CSS
          </p>
        </div>
      </div>
    </div>
  );
};