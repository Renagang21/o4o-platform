import React from 'react';
import { Plus, X, Facebook, Twitter, Instagram, Linkedin, Youtube, Github } from 'lucide-react';

interface SocialLink {
  type: string;
  url: string;
}

interface SocialIconsSettingsProps {
  settings: any;
  onChange: (key: string, value: any) => void;
}

const SOCIAL_PLATFORMS = [
  { value: 'facebook', label: 'Facebook', icon: Facebook },
  { value: 'twitter', label: 'Twitter', icon: Twitter },
  { value: 'instagram', label: 'Instagram', icon: Instagram },
  { value: 'linkedin', label: 'LinkedIn', icon: Linkedin },
  { value: 'youtube', label: 'YouTube', icon: Youtube },
  { value: 'github', label: 'GitHub', icon: Github },
];

export const SocialIconsSettings: React.FC<SocialIconsSettingsProps> = ({
  settings,
  onChange
}) => {
  const links: SocialLink[] = settings.links || [];
  const shape = settings.shape || 'circle';
  const size = settings.size || 24;
  const colorMode = settings.colorMode || 'brand';

  const addLink = () => {
    const newLinks = [...links, { type: 'facebook', url: '' }];
    onChange('links', newLinks);
  };

  const removeLink = (index: number) => {
    const newLinks = links.filter((_, i) => i !== index);
    onChange('links', newLinks);
  };

  const updateLink = (index: number, field: 'type' | 'url', value: string) => {
    const newLinks = [...links];
    newLinks[index] = { ...newLinks[index], [field]: value };
    onChange('links', newLinks);
  };

  return (
    <div className="inspector-section">
      <h4 className="inspector-section-title">Social Icons Settings</h4>

      {/* Social Links List */}
      <div className="inspector-field">
        <label className="inspector-label">Social Links</label>
        <div className="social-links-list">
          {links.map((link, index) => (
            <div key={index} className="social-link-item">
              <select
                className="inspector-select"
                value={link.type}
                onChange={(e) => updateLink(index, 'type', e.target.value)}
              >
                {SOCIAL_PLATFORMS.map(platform => (
                  <option key={platform.value} value={platform.value}>
                    {platform.label}
                  </option>
                ))}
              </select>
              <input
                type="text"
                className="inspector-input"
                value={link.url}
                onChange={(e) => updateLink(index, 'url', e.target.value)}
                placeholder="https://..."
              />
              <button
                className="remove-link-btn"
                onClick={() => removeLink(index)}
                title="Remove link"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
        <button className="add-link-btn" onClick={addLink}>
          <Plus size={16} /> Add Social Link
        </button>
      </div>

      {/* Shape */}
      <div className="inspector-field">
        <label className="inspector-label">Icon Shape</label>
        <select
          className="inspector-select"
          value={shape}
          onChange={(e) => onChange('shape', e.target.value)}
        >
          <option value="circle">Circle</option>
          <option value="square">Square</option>
          <option value="rounded">Rounded</option>
        </select>
        <p className="inspector-help">Shape of the icon container</p>
      </div>

      {/* Size */}
      <div className="inspector-field">
        <label className="inspector-label">Icon Size (px)</label>
        <input
          type="number"
          className="inspector-input"
          value={size}
          onChange={(e) => onChange('size', parseInt(e.target.value) || 24)}
          min="16"
          max="48"
        />
        <p className="inspector-help">Size of the social icons (16-48px)</p>
      </div>

      {/* Color Mode */}
      <div className="inspector-field">
        <label className="inspector-label">Color Mode</label>
        <select
          className="inspector-select"
          value={colorMode}
          onChange={(e) => onChange('colorMode', e.target.value)}
        >
          <option value="brand">Brand Colors</option>
          <option value="monochrome">Monochrome</option>
        </select>
        <p className="inspector-help">Use official brand colors or monochrome</p>
      </div>

      {/* Preview */}
      {links.length > 0 && (
        <div className="inspector-field">
          <label className="inspector-label">Preview</label>
          <div className="social-preview">
            {links.map((link, index) => {
              const platform = SOCIAL_PLATFORMS.find(p => p.type === link.type);
              const Icon = platform?.icon || Facebook;
              return (
                <div
                  key={index}
                  className={`social-icon-preview ${shape} ${colorMode}`}
                  style={{ width: `${size}px`, height: `${size}px` }}
                  title={link.type}
                >
                  <Icon size={size * 0.6} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      <style>{`
        .social-links-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 12px;
        }

        .social-link-item {
          display: grid;
          grid-template-columns: 120px 1fr auto;
          gap: 8px;
          align-items: center;
        }

        .remove-link-btn {
          background: none;
          border: none;
          color: #999;
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: all 0.2s;
        }

        .remove-link-btn:hover {
          background: #fee;
          color: #e74c3c;
        }

        .add-link-btn {
          width: 100%;
          padding: 8px;
          border: 2px dashed #d0d0d0;
          border-radius: 4px;
          background: transparent;
          color: #666;
          font-size: 13px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: all 0.2s;
        }

        .add-link-btn:hover {
          border-color: #2196F3;
          color: #2196F3;
          background: #f0f8ff;
        }

        .social-preview {
          padding: 16px;
          background: #f5f5f5;
          border: 1px dashed #d0d0d0;
          border-radius: 4px;
          display: flex;
          gap: 8px;
          justify-content: center;
          flex-wrap: wrap;
        }

        .social-icon-preview {
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          cursor: pointer;
        }

        .social-icon-preview.circle {
          border-radius: 50%;
        }

        .social-icon-preview.square {
          border-radius: 0;
        }

        .social-icon-preview.rounded {
          border-radius: 8px;
        }

        .social-icon-preview.brand {
          background: #2196F3;
          color: white;
        }

        .social-icon-preview.monochrome {
          background: #333;
          color: white;
        }

        .social-icon-preview:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </div>
  );
};
