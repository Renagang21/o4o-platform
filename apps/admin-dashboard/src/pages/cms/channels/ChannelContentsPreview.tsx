/**
 * Channel Contents Preview Modal
 *
 * WO-P4-CHANNEL-IMPLEMENT-P0: Preview what content is currently available for a channel
 *
 * This shows the result of GET /channels/:id/contents - the actual content
 * that would be displayed on this channel right now.
 */

import { useState, useEffect } from 'react';
import { X, RefreshCw, Tv, Image, ExternalLink, Clock, AlertCircle } from 'lucide-react';
import channelAPI, { Channel, ChannelContent, ChannelContentsResponse } from '@/lib/channels';
import toast from 'react-hot-toast';

interface ChannelContentsPreviewProps {
  channel: Channel;
  onClose: () => void;
}

export default function ChannelContentsPreview({
  channel,
  onClose,
}: ChannelContentsPreviewProps) {
  const [loading, setLoading] = useState(true);
  const [response, setResponse] = useState<ChannelContentsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadContents = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await channelAPI.getChannelContents(channel.id);
      setResponse(data);
    } catch (err: any) {
      console.error('Failed to load channel contents:', err);
      setError(err.response?.data?.error?.message || 'Failed to load contents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContents();
  }, [channel.id]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleString();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative w-full max-w-3xl rounded-lg bg-white shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                <Tv className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{channel.name}</h2>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>Slot: <code className="rounded bg-gray-100 px-1">{channel.slotKey}</code></span>
                  {channel.serviceKey && <span>| Service: {channel.serviceKey}</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={loadContents}
                className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                title="Refresh"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={onClose}
                className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="max-h-[70vh] overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertCircle className="h-12 w-12 text-red-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Error Loading Contents</h3>
                <p className="mt-1 text-sm text-gray-500">{error}</p>
              </div>
            ) : !response || response.data.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Image className="h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No Contents Available</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {response?.meta?.message ||
                    `No published content found for slot "${channel.slotKey}"`}
                </p>
                <p className="mt-2 text-xs text-gray-400">
                  Make sure there are published contents assigned to this slot key.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Summary */}
                <div className="rounded-lg bg-gray-50 p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <span className="font-medium text-gray-900">
                        {response.data.length} content{response.data.length !== 1 ? 's' : ''}
                      </span>
                      <span className="text-gray-500"> available for display</span>
                    </div>
                    {response.meta.fetchedAt && (
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        Fetched: {formatDate(response.meta.fetchedAt)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Content List */}
                <div className="space-y-3">
                  {response.data.map((item, index) => (
                    <div
                      key={item.slotId}
                      className="rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md"
                    >
                      <div className="flex gap-4">
                        {/* Thumbnail */}
                        {item.content.imageUrl ? (
                          <div className="h-24 w-32 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                            <img
                              src={item.content.imageUrl}
                              alt={item.content.title}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="flex h-24 w-32 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100">
                            <Image className="h-8 w-8 text-gray-400" />
                          </div>
                        )}

                        {/* Content Info */}
                        <div className="flex-1 space-y-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-gray-500">
                                  #{index + 1}
                                </span>
                                <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-800">
                                  {item.content.type}
                                </span>
                              </div>
                              <h4 className="mt-1 font-medium text-gray-900">
                                {item.content.title}
                              </h4>
                            </div>
                            {item.content.linkUrl && (
                              <a
                                href={item.content.linkUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            )}
                          </div>

                          {item.content.summary && (
                            <p className="line-clamp-2 text-sm text-gray-600">
                              {item.content.summary}
                            </p>
                          )}

                          {/* Time Window */}
                          {(item.startsAt || item.endsAt) && (
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              {item.startsAt && (
                                <span>From: {formatDate(item.startsAt)}</span>
                              )}
                              {item.endsAt && (
                                <span>Until: {formatDate(item.endsAt)}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t bg-gray-50 px-6 py-4">
            <div className="text-xs text-gray-500">
              Channel Status:{' '}
              <span
                className={`font-medium ${
                  channel.status === 'active'
                    ? 'text-green-600'
                    : channel.status === 'maintenance'
                    ? 'text-yellow-600'
                    : 'text-gray-600'
                }`}
              >
                {channel.status}
              </span>
            </div>
            <button
              onClick={onClose}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
