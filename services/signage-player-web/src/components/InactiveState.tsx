import type { Channel } from '@/api/channels'

interface InactiveStateProps {
  channel: Channel
}

export default function InactiveState({ channel }: InactiveStateProps) {
  const isMaintenance = channel.status === 'maintenance'

  return (
    <div className="inactive-container">
      <svg
        className="empty-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        {isMaintenance ? (
          <>
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
          </>
        ) : (
          <>
            <circle cx="12" cy="12" r="10" />
            <path d="M4.93 4.93l14.14 14.14" />
          </>
        )}
      </svg>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
        {isMaintenance ? 'Under Maintenance' : 'Channel Inactive'}
      </h2>
      <p style={{ color: '#666' }}>
        {channel.name}
      </p>
      {isMaintenance && (
        <p style={{ color: '#555', marginTop: '1rem', fontSize: '0.9rem' }}>
          This channel is currently undergoing maintenance.
        </p>
      )}
    </div>
  )
}
