interface EmptyStateProps {
  channelName?: string
}

export default function EmptyState({ channelName }: EmptyStateProps) {
  return (
    <div className="empty-container">
      <svg
        className="empty-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M9 9h6" />
        <path d="M9 12h6" />
        <path d="M9 15h4" />
      </svg>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: '#888' }}>
        No Content Available
      </h2>
      {channelName && (
        <p style={{ color: '#666' }}>
          Channel: {channelName}
        </p>
      )}
      <p style={{ color: '#555', marginTop: '1rem', fontSize: '0.9rem' }}>
        Content will appear when added to this channel.
      </p>
    </div>
  )
}
