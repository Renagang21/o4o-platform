import { FC } from 'react';
import { HelpCircle, X } from 'lucide-react';
import { useHelpTabs } from '@/hooks/useHelpTabs';
import { cn } from '@/lib/utils';

/**
 * WordPress-style Help Tab component
 */
export const HelpTab: FC = () => {
  const { 
    isOpen, 
    activeTab, 
    tabs, 
    sidebar,
    toggleHelp, 
    closeHelp, 
    setActiveTab 
  } = useHelpTabs();

  // Don't render if no tabs registered
  if (tabs.length === 0) {
    return null;
  }

  const currentTab = tabs.find(tab => tab.id === activeTab);

  return (
    <>
      {/* Help Tab Button */}
      <div id="contextual-help-link-wrap" className="hide-if-no-js screen-meta-toggle">
        <button
          type="button"
          id="contextual-help-link"
          className={cn("button show-settings", isOpen && "screen-meta-active")}
          aria-controls="contextual-help-wrap"
          aria-expanded={isOpen}
          onClick={toggleHelp}
        >
          <HelpCircle className="w-4 h-4 inline mr-1" />
          Help
        </button>
      </div>

      {/* Help Content Panel */}
      <div
        id="contextual-help-wrap"
        className={cn(
          "contextual-help-wrap hidden",
          isOpen && "contextual-help-open"
        )}
        aria-label="Contextual Help Tab"
      >
        <div id="contextual-help-back" className={isOpen ? 'contextual-help-open' : ''}></div>
        <div id="contextual-help-columns">
          <div className="contextual-help-tabs">
            <ul>
              {tabs.map(tab => (
                <li
                  key={tab.id}
                  id={`tab-link-${tab.id}`}
                  className={activeTab === tab.id ? 'active' : ''}
                >
                  <a
                    href={`#tab-panel-${tab.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      setActiveTab(tab.id);
                    }}
                    aria-controls={`tab-panel-${tab.id}`}
                  >
                    {tab.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {sidebar && (
            <div className="contextual-help-sidebar">
              <h3>{sidebar.title}</h3>
              {typeof sidebar.content === 'string' ? (
                <div dangerouslySetInnerHTML={{ __html: sidebar.content }} />
              ) : (
                sidebar.content
              )}
            </div>
          )}

          <div className="contextual-help-tabs-wrap">
            {tabs.map(tab => (
              <div
                key={tab.id}
                id={`tab-panel-${tab.id}`}
                className={cn(
                  "help-tab-content",
                  activeTab === tab.id ? "active" : ""
                )}
              >
                {typeof tab.content === 'string' ? (
                  <div dangerouslySetInnerHTML={{ __html: tab.content }} />
                ) : (
                  tab.content
                )}
              </div>
            ))}
          </div>
        </div>
        
        <button
          type="button"
          className="contextual-help-close"
          onClick={closeHelp}
          aria-label="Close Help"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </>
  );
};