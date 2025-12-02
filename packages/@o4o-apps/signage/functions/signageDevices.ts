/**
 * Signage Devices Function Component
 * Displays list of digital signage devices
 */
export const signageDevices = (props: any) => {
  const devices = props.data || [];

  return {
    type: 'DeviceCard',
    props: {
      devices: devices.map((device: any) => ({
        id: device.id,
        name: device.name,
        token: device.token,
        active: device.active,
        location: device.location,
        resolution: device.resolution,
        orientation: device.orientation,
        lastHeartbeat: device.lastHeartbeat,
        registeredAt: device.registeredAt,
      })),
    },
  };
};
