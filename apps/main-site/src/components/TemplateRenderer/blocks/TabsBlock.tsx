import { CSSProperties, FC, useState } from 'react';
import TemplateRenderer from '../index';
import { TemplateBlock } from '../../../api/content/contentApi';

interface TabItem {
  label: string;
  blocks: TemplateBlock[];
}

interface TabsBlockProps {
  tabs?: TabItem[];
  innerBlocks?: TemplateBlock[]; // AI-generated structure
  settings?: {
    defaultTab?: number;
    tabStyle?: 'default' | 'pills' | 'underline';
    tabAlignment?: 'left' | 'center' | 'right';
  };
}

const TabsBlock: FC<TabsBlockProps> = ({
  tabs = [],
  innerBlocks = [],
  settings = {}
}) => {
  const {
    defaultTab = 0,
    tabStyle = 'default',
    tabAlignment = 'left'
  } = settings;

  // Handle both old structure (tabs) and new AI-generated structure (innerBlocks)
  const tabsData: TabItem[] = innerBlocks.length > 0
    ? innerBlocks.map(block => ({
        label: block.attributes?.label || block.attributes?.title || 'Tab',
        blocks: block.innerBlocks || []
      }))
    : tabs;

  const [activeTab, setActiveTab] = useState(defaultTab);

  // If no tabs, return null
  if (tabsData.length === 0) {
    return (
      <div className="tabs-block-empty" style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
        탭이 없습니다. 탭을 추가해주세요.
      </div>
    );
  }

  // Ensure activeTab is within bounds
  const currentTab = activeTab >= 0 && activeTab < tabsData.length ? activeTab : 0;

  // Container styles
  const containerStyle: CSSProperties = {
    marginBottom: '2rem',
  };

  // Tab list styles
  const getTabListStyle = (): CSSProperties => {
    const baseStyle: CSSProperties = {
      display: 'flex',
      listStyle: 'none',
      padding: 0,
      margin: 0,
      marginBottom: '1.5rem',
      borderBottom: tabStyle === 'underline' ? '2px solid #e5e7eb' : 'none',
      gap: tabStyle === 'pills' ? '0.5rem' : 0,
    };

    // Alignment
    if (tabAlignment === 'center') {
      baseStyle.justifyContent = 'center';
    } else if (tabAlignment === 'right') {
      baseStyle.justifyContent = 'flex-end';
    }

    return baseStyle;
  };

  // Individual tab button styles
  const getTabButtonStyle = (isActive: boolean): CSSProperties => {
    const baseStyle: CSSProperties = {
      padding: '0.75rem 1.5rem',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      fontSize: '1rem',
      fontWeight: isActive ? '600' : '400',
      color: isActive ? '#2563eb' : '#6b7280',
      transition: 'all 0.2s ease',
    };

    // Style variants
    if (tabStyle === 'pills') {
      baseStyle.borderRadius = '0.5rem';
      baseStyle.backgroundColor = isActive ? '#dbeafe' : '#f3f4f6';
      baseStyle.color = isActive ? '#2563eb' : '#4b5563';
    } else if (tabStyle === 'underline') {
      baseStyle.borderBottom = isActive ? '2px solid #2563eb' : '2px solid transparent';
      baseStyle.marginBottom = '-2px';
    } else {
      // default style
      baseStyle.borderBottom = isActive ? '3px solid #2563eb' : '3px solid transparent';
      baseStyle.backgroundColor = isActive ? '#f9fafb' : 'transparent';
    }

    return baseStyle;
  };

  // Tab panel styles
  const tabPanelStyle: CSSProperties = {
    padding: '1.5rem 0',
  };

  return (
    <div className="tabs-block" style={containerStyle}>
      {/* Tab List */}
      <ul role="tablist" style={getTabListStyle()}>
        {tabsData.map((tab, index) => (
          <li key={index} role="presentation">
            <button
              role="tab"
              aria-selected={currentTab === index}
              aria-controls={`tab-panel-${index}`}
              id={`tab-${index}`}
              onClick={() => setActiveTab(index)}
              onMouseEnter={(e) => {
                if (currentTab !== index) {
                  e.currentTarget.style.color = '#2563eb';
                  if (tabStyle === 'pills') {
                    e.currentTarget.style.backgroundColor = '#e5e7eb';
                  }
                }
              }}
              onMouseLeave={(e) => {
                if (currentTab !== index) {
                  e.currentTarget.style.color = '#6b7280';
                  if (tabStyle === 'pills') {
                    e.currentTarget.style.backgroundColor = '#f3f4f6';
                  }
                }
              }}
              style={getTabButtonStyle(currentTab === index)}
            >
              {tab.label}
            </button>
          </li>
        ))}
      </ul>

      {/* Tab Panel */}
      <div
        role="tabpanel"
        id={`tab-panel-${currentTab}`}
        aria-labelledby={`tab-${currentTab}`}
        style={tabPanelStyle}
      >
        <TemplateRenderer blocks={tabsData[currentTab].blocks} />
      </div>
    </div>
  );
};

export default TabsBlock;
