/**
 * Signage Playback Function Component
 * Displays digital signage player with current playlist
 */
export const signagePlayback = (props: any) => {
  const data = props.data || {};
  const playlist = data.playlist || {};
  const slides = data.slides || [];
  const schedule = data.schedule || {};

  if (!playlist.id || slides.length === 0) {
    return {
      type: 'div',
      props: {
        className: 'flex items-center justify-center h-screen bg-gray-900 text-white text-2xl',
        children: 'No active playlist scheduled for this device',
      },
    };
  }

  return {
    type: 'SignagePlayer',
    props: {
      playlist: {
        id: playlist.id,
        title: playlist.title,
        loop: playlist.loop,
      },
      slides: slides.map((slide: any) => ({
        id: slide.id,
        title: slide.title,
        json: slide.json,
        duration: slide.duration || 10,
      })),
      schedule: {
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        priority: schedule.priority,
      },
    },
  };
};
