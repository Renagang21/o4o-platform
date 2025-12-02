/**
 * Order Timeline Component
 * R-6-9: Visual timeline of order status changes
 */

import React from 'react';
import { Check, Package, CreditCard, Truck, CheckCircle, XCircle } from 'lucide-react';

interface TimelineEvent {
  status: string;
  timestamp: string;
  label: string;
}

interface OrderTimelineProps {
  events: TimelineEvent[];
  currentStatus: string;
}

// Get icon for timeline event
const getStatusIcon = (status: string) => {
  switch (status) {
    case 'pending':
      return Package;
    case 'paid':
    case 'confirmed':
      return CreditCard;
    case 'processing':
      return Package;
    case 'shipped':
      return Truck;
    case 'delivered':
      return CheckCircle;
    case 'cancelled':
    case 'refunded':
      return XCircle;
    default:
      return Package;
  }
};

// Get color for status
const getStatusColor = (status: string, isActive: boolean) => {
  if (!isActive) {
    return 'text-gray-300 bg-gray-100';
  }

  switch (status) {
    case 'pending':
      return 'text-yellow-600 bg-yellow-100';
    case 'paid':
    case 'confirmed':
      return 'text-blue-600 bg-blue-100';
    case 'processing':
      return 'text-purple-600 bg-purple-100';
    case 'shipped':
      return 'text-indigo-600 bg-indigo-100';
    case 'delivered':
      return 'text-green-600 bg-green-100';
    case 'cancelled':
    case 'refunded':
      return 'text-red-600 bg-red-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
};

export const OrderTimeline: React.FC<OrderTimelineProps> = ({ events, currentStatus }) => {
  if (events.length === 0) {
    return null;
  }

  // Sort events by timestamp
  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Find current event index
  const currentEventIndex = sortedEvents.findIndex((e) => e.status === currentStatus);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">주문 진행 상태</h2>

      <div className="relative">
        {/* Timeline */}
        <div className="flex items-start justify-between">
          {sortedEvents.map((event, index) => {
            const Icon = getStatusIcon(event.status);
            const isActive = index <= currentEventIndex;
            const isLast = index === sortedEvents.length - 1;
            const colorClasses = getStatusColor(event.status, isActive);

            const eventDate = new Date(event.timestamp);
            const formattedDate = eventDate.toLocaleDateString('ko-KR', {
              month: 'short',
              day: 'numeric',
            });
            const formattedTime = eventDate.toLocaleTimeString('ko-KR', {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div key={event.status} className="flex flex-col items-center flex-1 relative">
                {/* Connector Line */}
                {!isLast && (
                  <div
                    className={`absolute top-5 left-1/2 w-full h-0.5 -z-10 ${
                      isActive && index < currentEventIndex ? 'bg-blue-500' : 'bg-gray-200'
                    }`}
                    style={{ transform: 'translateX(50%)' }}
                  />
                )}

                {/* Icon Circle */}
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${colorClasses} transition-colors relative z-10`}
                >
                  {isActive ? (
                    <Icon className="w-5 h-5" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-gray-400" />
                  )}
                </div>

                {/* Label */}
                <div className="mt-3 text-center">
                  <div
                    className={`text-sm font-medium ${
                      isActive ? 'text-gray-900' : 'text-gray-400'
                    }`}
                  >
                    {event.label}
                  </div>
                  {isActive && (
                    <div className="mt-1 text-xs text-gray-500">
                      {formattedDate} {formattedTime}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile View - Vertical Timeline */}
      <div className="md:hidden mt-6 space-y-4">
        {sortedEvents.map((event, index) => {
          const Icon = getStatusIcon(event.status);
          const isActive = index <= currentEventIndex;
          const colorClasses = getStatusColor(event.status, isActive);

          const eventDate = new Date(event.timestamp);
          const formattedDate = eventDate.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          });
          const formattedTime = eventDate.toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit',
          });

          return (
            <div key={event.status} className="flex items-start gap-3">
              {/* Icon */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${colorClasses}`}>
                {isActive ? <Icon className="w-4 h-4" /> : <div className="w-2 h-2 rounded-full bg-gray-400" />}
              </div>

              {/* Content */}
              <div className="flex-1">
                <div className={`font-medium ${isActive ? 'text-gray-900' : 'text-gray-400'}`}>
                  {event.label}
                </div>
                {isActive && (
                  <div className="text-xs text-gray-500 mt-1">
                    {formattedDate} {formattedTime}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OrderTimeline;
