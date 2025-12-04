/**
 * Marketing Block - TeamMember
 *
 * Team member profile card with photo, name, role, and bio
 */

export interface TeamMemberProps {
  name: string;
  role: string;
  bio?: string;
  photo?: string;
  linkedin?: string;
  twitter?: string;
  email?: string;
  layout?: 'card' | 'minimal';
}

export default function TeamMember({
  name = 'John Doe',
  role = 'CEO & Founder',
  bio,
  photo = 'https://via.placeholder.com/300x300',
  linkedin,
  twitter,
  email,
  layout = 'card',
}: TeamMemberProps) {
  if (layout === 'minimal') {
    return (
      <div className="text-center">
        <img
          src={photo}
          alt={name}
          className="w-32 h-32 rounded-full mx-auto mb-4 object-cover"
        />
        <h3 className="text-xl font-bold text-gray-900">{name}</h3>
        <p className="text-gray-600">{role}</p>
        {(linkedin || twitter || email) && (
          <div className="flex gap-3 justify-center mt-3">
            {linkedin && (
              <a href={linkedin} className="text-blue-600 hover:text-blue-700">
                in
              </a>
            )}
            {twitter && (
              <a href={twitter} className="text-blue-400 hover:text-blue-500">
                𝕏
              </a>
            )}
            {email && (
              <a href={`mailto:${email}`} className="text-gray-600 hover:text-gray-700">
                ✉
              </a>
            )}
          </div>
        )}
      </div>
    );
  }

  // Default: card layout
  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
      <img
        src={photo}
        alt={name}
        className="w-full aspect-square object-cover rounded-lg mb-4"
      />
      <h3 className="text-xl font-bold text-gray-900 mb-1">{name}</h3>
      <p className="text-blue-600 font-medium mb-3">{role}</p>
      {bio && <p className="text-gray-600 text-sm mb-4">{bio}</p>}
      {(linkedin || twitter || email) && (
        <div className="flex gap-3 pt-4 border-t border-gray-200">
          {linkedin && (
            <a
              href={linkedin}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              target="_blank"
              rel="noopener noreferrer"
            >
              LinkedIn
            </a>
          )}
          {twitter && (
            <a
              href={twitter}
              className="text-blue-400 hover:text-blue-500 text-sm font-medium"
              target="_blank"
              rel="noopener noreferrer"
            >
              Twitter
            </a>
          )}
          {email && (
            <a
              href={`mailto:${email}`}
              className="text-gray-600 hover:text-gray-700 text-sm font-medium"
            >
              Email
            </a>
          )}
        </div>
      )}
    </div>
  );
}
