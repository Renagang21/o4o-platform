interface Playlist {
  id: string;
  title: string;
  description?: string;
  active: boolean;
  loop: boolean;
  items: any[];
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

interface PlaylistCardProps {
  playlists: Playlist[];
}

export function PlaylistCard({ playlists }: PlaylistCardProps) {
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Playlists</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage your digital signage playlists
          </p>
        </div>
        <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          Create Playlist
        </button>
      </div>

      {playlists.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <p className="text-gray-600">No playlists created yet</p>
          <p className="mt-2 text-sm text-gray-500">
            Create your first playlist to organize slides
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {playlists.map((playlist) => (
            <div
              key={playlist.id}
              className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {playlist.title}
                  </h3>
                  {playlist.description && (
                    <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                      {playlist.description}
                    </p>
                  )}
                </div>
                <span
                  className={`ml-2 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    playlist.active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {playlist.active ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">📋 Slides</span>
                  <span className="font-medium text-gray-900">
                    {playlist.itemCount}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">🔁 Loop</span>
                  <span
                    className={`font-medium ${
                      playlist.loop ? 'text-green-700' : 'text-gray-500'
                    }`}
                  >
                    {playlist.loop ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="text-xs text-gray-500 pt-2">
                  Updated {formatDate(playlist.updatedAt)}
                </div>
              </div>

              <div className="mt-4 border-t border-gray-100 pt-4">
                {playlist.itemCount > 0 ? (
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {[...Array(Math.min(3, playlist.itemCount))].map((_, i) => (
                        <div
                          key={i}
                          className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 border-2 border-white flex items-center justify-center text-xs"
                        >
                          {i + 1}
                        </div>
                      ))}
                    </div>
                    {playlist.itemCount > 3 && (
                      <span className="text-xs text-gray-500">
                        +{playlist.itemCount - 3} more
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">No slides added</p>
                )}
              </div>

              <div className="mt-4 flex gap-2">
                <button className="flex-1 rounded bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">
                  Edit
                </button>
                <button className="flex-1 rounded bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100">
                  View
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
