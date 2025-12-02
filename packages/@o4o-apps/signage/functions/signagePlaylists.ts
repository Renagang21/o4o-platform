/**
 * Signage Playlists Function Component
 * Displays list of digital signage playlists
 */
export const signagePlaylists = (props: any) => {
  const playlists = props.data || [];

  return {
    type: 'PlaylistCard',
    props: {
      playlists: playlists.map((playlist: any) => ({
        id: playlist.id,
        title: playlist.title,
        description: playlist.description,
        active: playlist.active,
        loop: playlist.loop,
        items: playlist.items || [],
        itemCount: playlist.items?.length || 0,
        createdAt: playlist.createdAt,
        updatedAt: playlist.updatedAt,
      })),
    },
  };
};
