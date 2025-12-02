interface Device {
  id: string;
  name: string;
  token: string;
  active: boolean;
  location?: string;
  resolution?: string;
  orientation?: string;
  lastHeartbeat?: string;
  registeredAt: string;
}

interface DeviceCardProps {
  devices: Device[];
}

export function DeviceCard({ devices }: DeviceCardProps) {
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const getTimeSince = (dateString?: string) => {
    if (!dateString) return 'Never';
    const now = new Date();
    const last = new Date(dateString);
    const diffMs = now.getTime() - last.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const isOnline = (lastHeartbeat?: string) => {
    if (!lastHeartbeat) return false;
    const last = new Date(lastHeartbeat);
    const now = new Date();
    const diffMinutes = (now.getTime() - last.getTime()) / 60000;
    return diffMinutes < 5; // Online if heartbeat within 5 minutes
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Devices</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage your digital signage display devices
          </p>
        </div>
        <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          Add Device
        </button>
      </div>

      {devices.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <p className="text-gray-600">No devices registered yet</p>
          <p className="mt-2 text-sm text-gray-500">
            Add your first device to get started
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {devices.map((device) => {
            const online = isOnline(device.lastHeartbeat);
            return (
              <div
                key={device.id}
                className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {device.name}
                    </h3>
                    {device.location && (
                      <p className="mt-1 text-sm text-gray-600">📍 {device.location}</p>
                    )}
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      device.active
                        ? online
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {device.active ? (online ? 'Online' : 'Offline') : 'Inactive'}
                  </span>
                </div>

                <div className="mt-4 space-y-2">
                  {device.resolution && (
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="mr-2">🖥️</span>
                      <span>{device.resolution}</span>
                      {device.orientation && (
                        <span className="ml-2 text-gray-400">
                          ({device.orientation})
                        </span>
                      )}
                    </div>
                  )}
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="mr-2">🔗</span>
                    <span className="truncate font-mono text-xs">
                      {device.token.substring(0, 24)}...
                    </span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="mr-2">💓</span>
                    <span>Last seen: {getTimeSince(device.lastHeartbeat)}</span>
                  </div>
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
            );
          })}
        </div>
      )}
    </div>
  );
}
