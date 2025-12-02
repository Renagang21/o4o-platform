/**
 * Signage Dashboard Function Component
 * Displays digital signage system statistics and overview
 */
export const signageDashboard = (props: any) => {
  const data = props.data || {};

  const stats = [
    {
      label: 'Total Devices',
      value: data.totalDevices || 0,
      active: data.activeDevices || 0,
      icon: 'Monitor',
      color: 'blue',
    },
    {
      label: 'Total Slides',
      value: data.totalSlides || 0,
      active: data.activeSlides || 0,
      icon: 'Image',
      color: 'green',
    },
    {
      label: 'Total Playlists',
      value: data.totalPlaylists || 0,
      active: data.activePlaylists || 0,
      icon: 'List',
      color: 'purple',
    },
    {
      label: 'Total Schedules',
      value: data.totalSchedules || 0,
      active: data.activeSchedules || 0,
      icon: 'Calendar',
      color: 'orange',
    },
  ];

  return {
    type: 'SignageGrid',
    props: {
      title: 'Digital Signage Dashboard',
      stats,
    },
  };
};
