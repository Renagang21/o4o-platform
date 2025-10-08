import React from 'react';
import { BlockDefinition } from '@o4o/block-core';

interface SocialLink {
  service: string;
  url: string;
  id: number;
}

type SocialService = 'facebook' | 'twitter' | 'instagram' | 'youtube' | 'linkedin' | 'github';

interface SocialLinksBlockProps {
  attributes: {
    links: SocialLink[];
    iconColor?: string;
    iconBackgroundColor?: string;
    iconSize: 'small' | 'normal' | 'large';
  };
  setAttributes: (attrs: Partial<SocialLinksBlockProps['attributes']>) => void;
}

const SOCIAL_SERVICES = {
  facebook: { label: 'Facebook', icon: 'M12 2C6.5 2 2 6.5 2 12c0 5 3.7 9.1 8.4 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.3v7C18.3 21.1 22 17 22 12c0-5.5-4.5-10-10-10z' },
  twitter: { label: 'Twitter', icon: 'M22.23 5.924c-.736.326-1.527.547-2.357.646.847-.508 1.498-1.312 1.804-2.27-.793.47-1.671.812-2.606.996C18.325 4.498 17.258 4 16.078 4c-2.266 0-4.103 1.837-4.103 4.103 0 .322.036.635.106.935-3.409-.171-6.433-1.805-8.457-4.287-.353.607-.556 1.312-.556 2.064 0 1.424.724 2.679 1.825 3.415-.673-.021-1.305-.206-1.859-.514v.052c0 1.988 1.414 3.647 3.292 4.023-.344.094-.707.145-1.081.145-.264 0-.522-.026-.773-.074.522 1.63 2.038 2.817 3.833 2.85-1.404 1.1-3.174 1.756-5.096 1.756-.331 0-.658-.019-.98-.057 1.816 1.164 3.973 1.843 6.29 1.843 7.547 0 11.675-6.252 11.675-11.675 0-.178-.004-.355-.012-.531.802-.578 1.497-1.301 2.047-2.124z' },
  instagram: { label: 'Instagram', icon: 'M12 4.622c2.403 0 2.688.009 3.637.052.877.04 1.354.187 1.671.31.42.163.72.358 1.035.673.315.315.51.615.673 1.035.123.317.27.794.31 1.671.043.949.052 1.234.052 3.637s-.009 2.688-.052 3.637c-.04.877-.187 1.354-.31 1.671-.163.42-.358.72-.673 1.035-.315.315-.615.51-1.035.673-.317.123-.794.27-1.671.31-.949.043-1.234.052-3.637.052s-2.688-.009-3.637-.052c-.877-.04-1.354-.187-1.671-.31-.42-.163-.72-.358-1.035-.673-.315-.315-.51-.615-.673-1.035-.123-.317-.27-.794-.31-1.671-.043-.949-.052-1.234-.052-3.637s.009-2.688.052-3.637c.04-.877.187-1.354.31-1.671.163-.42.358-.72.673-1.035.315-.315.615-.51 1.035-.673.317-.123.794-.27 1.671-.31.949-.043 1.234-.052 3.637-.052M12 3c-2.444 0-2.75.01-3.71.054-.959.044-1.613.196-2.185.418-.592.23-1.094.538-1.594 1.038-.5.5-.809 1.002-1.039 1.594-.222.572-.374 1.226-.418 2.185C3.01 9.25 3 9.556 3 12s.01 2.75.054 3.71c.044.959.196 1.613.418 2.185.23.592.538 1.094 1.039 1.594.5.5 1.002.809 1.594 1.039.572.222 1.226.374 2.185.418.96.044 1.266.054 3.71.054s2.75-.01 3.71-.054c.959-.044 1.613-.196 2.185-.418.592-.23 1.094-.538 1.594-1.039.5-.5.809-1.002 1.039-1.594.222-.572.374-1.226.418-2.185.044-.96.054-1.266.054-3.71s-.01-2.75-.054-3.71c-.044-.959-.196-1.613-.418-2.185-.23-.592-.538-1.094-1.039-1.594-.5-.5-1.002-.809-1.594-1.039-.572-.222-1.226-.374-2.185-.418C14.75 3.01 14.444 3 12 3zm0 4.378c-2.552 0-4.622 2.069-4.622 4.622s2.069 4.622 4.622 4.622 4.622-2.069 4.622-4.622S14.552 7.378 12 7.378zM12 15c-1.657 0-3-1.343-3-3s1.343-3 3-3 3 1.343 3 3-1.343 3-3 3zm4.804-8.884c-.596 0-1.08.484-1.08 1.08s.484 1.08 1.08 1.08 1.08-.484 1.08-1.08-.483-1.08-1.08-1.08z' },
  youtube: { label: 'YouTube', icon: 'M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z' },
  linkedin: { label: 'LinkedIn', icon: 'M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z' },
  github: { label: 'GitHub', icon: 'M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z' }
};

const Edit: React.FC<SocialLinksBlockProps> = ({ attributes, setAttributes }) => {
  const { links = [], iconColor, iconBackgroundColor, iconSize = 'normal' } = attributes;

  const addLink = () => {
    const newLink: SocialLink = {
      id: Date.now(),
      service: 'facebook',
      url: ''
    };
    setAttributes({ links: [...links, newLink] });
  };

  const updateLink = (id: number, field: 'service' | 'url', value: string) => {
    setAttributes({
      links: links.map((link: SocialLink) =>
        link.id === id ? { ...link, [field]: value } : link
      )
    });
  };

  const removeLink = (id: number) => {
    setAttributes({ links: links.filter((link: SocialLink) => link.id !== id) });
  };

  const classNames = [
    'wp-block-social-links',
    iconSize && `is-${iconSize}`,
    iconColor && `has-${iconColor}-icon-color`,
    iconBackgroundColor && `has-${iconBackgroundColor}-icon-background-color`,
  ].filter(Boolean).join(' ');

  return (
    <div>
      <div className="block-editor-block-toolbar">
        <select
          value={iconSize}
          onChange={(e) => setAttributes({ iconSize: e.target.value as 'small' | 'normal' | 'large' })}
        >
          <option value="small">Small</option>
          <option value="normal">Normal</option>
          <option value="large">Large</option>
        </select>
        <button onClick={addLink} style={{ marginLeft: '10px' }}>
          Add Social Link
        </button>
      </div>

      <ul className={classNames}>
        {links.length === 0 ? (
          <li style={{ padding: '10px', background: '#f0f0f0' }}>
            Click "Add Social Link" to add social media links
          </li>
        ) : (
          links.map((link: SocialLink) => (
            <li key={link.id} className={`wp-social-link wp-social-link-${link.service}`}>
              <select
                value={link.service}
                onChange={(e) => updateLink(link.id, 'service', e.target.value)}
                style={{ marginRight: '5px' }}
              >
                {(['facebook', 'twitter', 'instagram', 'youtube', 'linkedin', 'github'] as const).map((key) => (
                  <option key={key} value={key}>{SOCIAL_SERVICES[key].label}</option>
                ))}
              </select>
              <input
                type="url"
                value={link.url}
                onChange={(e) => updateLink(link.id, 'url', e.target.value)}
                placeholder={`${SOCIAL_SERVICES[link.service as keyof typeof SOCIAL_SERVICES]?.label || ''} URL`}
                style={{ marginRight: '5px', width: '200px' }}
              />
              <button onClick={() => removeLink(link.id)}>×</button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
};

const Save: React.FC<Pick<SocialLinksBlockProps, 'attributes'>> = ({ attributes }) => {
  const { links = [], iconColor, iconBackgroundColor, iconSize = 'normal' } = attributes;

  const classNames = [
    'wp-block-social-links',
    iconSize && `is-${iconSize}`,
    iconColor && `has-${iconColor}-icon-color`,
    iconBackgroundColor && `has-${iconBackgroundColor}-icon-background-color`,
  ].filter(Boolean).join(' ');

  return (
    <ul className={classNames}>
      {links.map((link: SocialLink) => {
        const service = SOCIAL_SERVICES[link.service as keyof typeof SOCIAL_SERVICES];
        return (
          <li key={link.id} className={`wp-social-link wp-social-link-${link.service}`}>
            <a href={link.url} aria-label={service?.label}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d={service?.icon} />
              </svg>
            </a>
          </li>
        );
      })}
    </ul>
  );
};

const SocialLinksBlock: BlockDefinition = {
  name: 'o4o/social-links',
  title: 'Social Links',
  category: 'interactive',
  icon: 'share',
  description: 'Display links to your social media profiles.',
  keywords: ['social', 'links', 'share', 'facebook', 'twitter', 'instagram'],

  attributes: {
    links: {
      type: 'array',
      default: []
    },
    iconColor: {
      type: 'string'
    },
    iconBackgroundColor: {
      type: 'string'
    },
    iconSize: {
      type: 'string',
      default: 'normal'
    }
  },

  supports: {
    align: ['left', 'center', 'right'],
    anchor: true,
    className: true
  },

  edit: Edit,
  save: Save
};

export default SocialLinksBlock;