/**
 * SlideLink - Link and CTA button components for slides
 * Phase 4: Advanced features
 */

import React, { useState } from 'react';
import { 
  ExternalLink, 
  Link2, 
  MousePointer,
  Target,
  BarChart3,
  Edit3,
  Check,
  X
} from 'lucide-react';

export interface LinkConfig {
  url: string;
  target: '_self' | '_blank' | '_parent' | '_top';
  rel?: string;
  title?: string;
  trackingId?: string;
  clickArea: 'full' | 'button' | 'custom';
  customArea?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface CTAButton {
  text: string;
  link: LinkConfig;
  style: 'primary' | 'secondary' | 'outline' | 'ghost';
  size: 'small' | 'medium' | 'large';
  position: 'top-left' | 'top-center' | 'top-right' | 'center' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  icon?: 'arrow' | 'external' | 'download' | 'play';
  animation?: 'none' | 'pulse' | 'bounce' | 'slide';
}

interface SlideLinkProps {
  link?: LinkConfig;
  cta?: CTAButton;
  onLinkClick?: (link: LinkConfig) => void;
  children: React.ReactNode;
  isEditing?: boolean;
}

export const SlideLink: React.FC<SlideLinkProps> = ({
  link,
  cta,
  onLinkClick,
  children,
  isEditing = false
}) => {
  const [showClickArea, setShowClickArea] = useState(false);

  const handleClick = (e: React.MouseEvent, linkConfig: LinkConfig) => {
    if (isEditing) {
      e.preventDefault();
      return;
    }

    if (onLinkClick) {
      onLinkClick(linkConfig);
    }

    // Track click if tracking ID is provided
    if (linkConfig.trackingId) {
      // Send analytics event
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'slide_link_click', {
          event_category: 'engagement',
          event_label: linkConfig.trackingId,
          value: linkConfig.url
        });
      }
    }

    // Handle different targets
    if (linkConfig.target === '_blank') {
      window.open(linkConfig.url, '_blank', 'noopener,noreferrer');
      e.preventDefault();
    } else if (linkConfig.target === '_self') {
      window.location.href = linkConfig.url;
      e.preventDefault();
    }
  };

  const renderCTAButton = () => {
    if (!cta) return null;

    const getPositionStyles = (): React.CSSProperties => {
      const positions = {
        'top-left': { top: '20px', left: '20px' },
        'top-center': { top: '20px', left: '50%', transform: 'translateX(-50%)' },
        'top-right': { top: '20px', right: '20px' },
        'center': { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
        'bottom-left': { bottom: '20px', left: '20px' },
        'bottom-center': { bottom: '20px', left: '50%', transform: 'translateX(-50%)' },
        'bottom-right': { bottom: '20px', right: '20px' }
      };
      return positions[cta.position] || {};
    };

    const getIcon = () => {
      switch (cta.icon) {
        case 'arrow': return '→';
        case 'external': return <ExternalLink size={16} />;
        case 'download': return '↓';
        case 'play': return '▶';
        default: return null;
      }
    };

    return (
      <a
        href={cta.link.url}
        target={cta.link.target}
        rel={cta.link.rel}
        title={cta.link.title}
        className={`slide-cta slide-cta--${cta.style} slide-cta--${cta.size} slide-cta--${cta.animation || 'none'}`}
        style={getPositionStyles()}
        onClick={(e) => handleClick(e, cta.link)}
      >
        <span>{cta.text}</span>
        {cta.icon && <span className="slide-cta__icon">{getIcon()}</span>}
      </a>
    );
  };

  const renderClickArea = () => {
    if (!link || !showClickArea || !isEditing) return null;

    if (link.clickArea === 'custom' && link.customArea) {
      return (
        <div 
          className="slide-link__custom-area"
          style={{
            left: `${link.customArea.x}%`,
            top: `${link.customArea.y}%`,
            width: `${link.customArea.width}%`,
            height: `${link.customArea.height}%`
          }}
        >
          <span>Click Area</span>
        </div>
      );
    }

    return null;
  };

  if (!link && !cta) {
    return <>{children}</>;
  }

  return (
    <div className="slide-link-wrapper">
      {link && link.clickArea === 'full' ? (
        <a
          href={link.url}
          target={link.target}
          rel={link.rel}
          title={link.title}
          className="slide-link slide-link--full"
          onClick={(e) => handleClick(e, link)}
        >
          {children}
        </a>
      ) : (
        <>
          {children}
          {link && link.clickArea === 'custom' && (
            <a
              href={link.url}
              target={link.target}
              rel={link.rel}
              title={link.title}
              className="slide-link slide-link--custom"
              style={link.customArea ? {
                left: `${link.customArea.x}%`,
                top: `${link.customArea.y}%`,
                width: `${link.customArea.width}%`,
                height: `${link.customArea.height}%`
              } : {}}
              onClick={(e) => handleClick(e, link)}
            >
              <span className="sr-only">Link</span>
            </a>
          )}
        </>
      )}
      
      {renderCTAButton()}
      {renderClickArea()}
      
      {isEditing && (link || cta) && (
        <button
          className="slide-link__toggle"
          onClick={() => setShowClickArea(!showClickArea)}
          title="Toggle click area visibility"
        >
          <MousePointer size={16} />
        </button>
      )}
    </div>
  );
};

interface LinkEditorProps {
  link?: LinkConfig;
  onChange: (link: LinkConfig | undefined) => void;
}

export const LinkEditor: React.FC<LinkEditorProps> = ({
  link,
  onChange
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempLink, setTempLink] = useState<LinkConfig>(link || {
    url: '',
    target: '_self',
    clickArea: 'full'
  });

  const handleSave = () => {
    if (tempLink.url) {
      onChange(tempLink);
    } else {
      onChange(undefined);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTempLink(link || {
      url: '',
      target: '_self',
      clickArea: 'full'
    });
    setIsEditing(false);
  };

  const handleRemove = () => {
    onChange(undefined);
    setIsEditing(false);
  };

  if (!isEditing) {
    return (
      <div className="link-editor">
        <div className="link-editor__display">
          {link ? (
            <>
              <Link2 size={16} />
              <span className="link-url">{link.url}</span>
              <span className="link-target">({link.target})</span>
            </>
          ) : (
            <span className="link-empty">No link set</span>
          )}
          <button 
            className="link-edit-btn"
            onClick={() => setIsEditing(true)}
          >
            <Edit3 size={14} />
            Edit
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="link-editor link-editor--editing">
      <div className="form-group">
        <label>URL</label>
        <input
          type="url"
          value={tempLink.url}
          onChange={(e) => setTempLink({ ...tempLink, url: e.target.value })}
          placeholder="https://example.com"
          className="form-input"
        />
      </div>

      <div className="form-group">
        <label>Open in</label>
        <select
          value={tempLink.target}
          onChange={(e) => setTempLink({ ...tempLink, target: e.target.value as any })}
          className="form-select"
        >
          <option value="_self">Same Tab</option>
          <option value="_blank">New Tab</option>
          <option value="_parent">Parent Frame</option>
          <option value="_top">Full Window</option>
        </select>
      </div>

      <div className="form-group">
        <label>Click Area</label>
        <select
          value={tempLink.clickArea}
          onChange={(e) => setTempLink({ ...tempLink, clickArea: e.target.value as any })}
          className="form-select"
        >
          <option value="full">Full Slide</option>
          <option value="button">Button Only</option>
          <option value="custom">Custom Area</option>
        </select>
      </div>

      {tempLink.clickArea === 'custom' && (
        <div className="custom-area-editor">
          <label>Custom Area (% values)</label>
          <div className="area-inputs">
            <input
              type="number"
              min="0"
              max="100"
              value={tempLink.customArea?.x || 0}
              onChange={(e) => setTempLink({
                ...tempLink,
                customArea: {
                  ...tempLink.customArea || { x: 0, y: 0, width: 50, height: 50 },
                  x: parseInt(e.target.value)
                }
              })}
              placeholder="X"
            />
            <input
              type="number"
              min="0"
              max="100"
              value={tempLink.customArea?.y || 0}
              onChange={(e) => setTempLink({
                ...tempLink,
                customArea: {
                  ...tempLink.customArea || { x: 0, y: 0, width: 50, height: 50 },
                  y: parseInt(e.target.value)
                }
              })}
              placeholder="Y"
            />
            <input
              type="number"
              min="0"
              max="100"
              value={tempLink.customArea?.width || 50}
              onChange={(e) => setTempLink({
                ...tempLink,
                customArea: {
                  ...tempLink.customArea || { x: 0, y: 0, width: 50, height: 50 },
                  width: parseInt(e.target.value)
                }
              })}
              placeholder="Width"
            />
            <input
              type="number"
              min="0"
              max="100"
              value={tempLink.customArea?.height || 50}
              onChange={(e) => setTempLink({
                ...tempLink,
                customArea: {
                  ...tempLink.customArea || { x: 0, y: 0, width: 50, height: 50 },
                  height: parseInt(e.target.value)
                }
              })}
              placeholder="Height"
            />
          </div>
        </div>
      )}

      <div className="form-group">
        <label>
          <BarChart3 size={14} />
          Tracking ID (optional)
        </label>
        <input
          type="text"
          value={tempLink.trackingId || ''}
          onChange={(e) => setTempLink({ ...tempLink, trackingId: e.target.value })}
          placeholder="slide-link-1"
          className="form-input"
        />
      </div>

      <div className="link-editor__actions">
        <button 
          className="btn btn-primary"
          onClick={handleSave}
        >
          <Check size={14} />
          Save
        </button>
        <button 
          className="btn btn-secondary"
          onClick={handleCancel}
        >
          <X size={14} />
          Cancel
        </button>
        {link && (
          <button 
            className="btn btn-danger"
            onClick={handleRemove}
          >
            Remove Link
          </button>
        )}
      </div>
    </div>
  );
};

export default SlideLink;