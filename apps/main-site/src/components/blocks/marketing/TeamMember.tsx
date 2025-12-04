/**
 * TeamMember Block Renderer
 */

import { BlockRendererProps } from '../BlockRenderer';

export const TeamMemberBlock = ({ node }: BlockRendererProps) => {
  const {
    name = '',
    role = '',
    bio = '',
    imageUrl = '',
    socialLinks = [],
  } = node.props;

  return (
    <div className="text-center">
      {imageUrl && (
        <img
          src={imageUrl}
          alt={name}
          className="w-32 h-32 rounded-full mx-auto mb-4 object-cover"
        />
      )}
      <h3 className="text-xl font-semibold mb-1">{name}</h3>
      {role && <p className="text-blue-600 font-medium mb-2">{role}</p>}
      {bio && <p className="text-gray-600 text-sm mb-4">{bio}</p>}
      {socialLinks && socialLinks.length > 0 && (
        <div className="flex justify-center gap-3">
          {socialLinks.map((link: { platform: string; url: string }, index: number) => (
            <a
              key={index}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-blue-600 transition-colors"
            >
              {link.platform}
            </a>
          ))}
        </div>
      )}
    </div>
  );
};
