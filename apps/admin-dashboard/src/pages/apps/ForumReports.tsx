import React, { useState, useEffect } from 'react';
import { Search, Filter, CheckCircle, XCircle, Clock, AlertTriangle, User, MessageSquare, FileText } from 'lucide-react';

interface ForumReport {
  id: string;
  postId?: string;
  commentId?: string;
  postTitle?: string;
  commentContent?: string;
  reporterId: string;
  reporterName: string;
  reportedUserId: string;
  reportedUserName: string;
  reason: 'spam' | 'harassment' | 'inappropriate' | 'misinformation' | 'copyright' | 'other';
  reasonDetails?: string;
  status: 'pending' | 'reviewing' | 'resolved' | 'dismissed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  reportCount: number;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolution?: string;
}

const ForumReports: React.FC = () => {
  const [reports, setReports] = useState<ForumReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<ForumReport | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'reviewing' | 'resolved' | 'dismissed'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'priority'>('priority');
  const [showResolutionModal, setShowResolutionModal] = useState(false);
  const [resolution, setResolution] = useState({ action: '', notes: '' });

  useEffect(() => {
    fetchReports();
  }, [filter, sortBy]);

  const fetchReports = async () => {
    try {
      const response = await fetch(`/api/forum/reports?status=${filter}&sort=${sortBy}`);
      const data = await response.json();
      setReports(data);
    } catch (error) {
      // Mock data for development
      setReports([
        {
          id: '1',
          postId: 'post-123',
          postTitle: 'Suspicious promotional content',
          reporterId: 'user-456',
          reporterName: 'John Doe',
          reportedUserId: 'user-789',
          reportedUserName: 'Spammer123',
          reason: 'spam',
          reasonDetails: 'This post contains multiple links to external sites selling products',
          status: 'pending',
          priority: 'high',
          reportCount: 5,
          createdAt: '2024-01-20T10:00:00Z',
          updatedAt: '2024-01-20T10:00:00Z'
        },
        {
          id: '2',
          commentId: 'comment-456',
          commentContent: 'Offensive language detected...',
          reporterId: 'user-111',
          reporterName: 'Jane Smith',
          reportedUserId: 'user-222',
          reportedUserName: 'ToxicUser',
          reason: 'harassment',
          reasonDetails: 'Using offensive language and personal attacks',
          status: 'reviewing',
          priority: 'critical',
          reportCount: 12,
          createdAt: '2024-01-19T15:30:00Z',
          updatedAt: '2024-01-20T09:00:00Z'
        }
      ]);
    }
  };

  const handleStatusChange = async (reportId: string, newStatus: string) => {
    try {
      await fetch(`/api/forum/reports/${reportId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      fetchReports();
    } catch (error) {
      // Update local state for demo
      setReports(prev => prev.map(r => 
        r.id === reportId ? { ...r, status: newStatus as any } : r
      ));
    }
  };

  const handleResolve = async () => {
    if (!selectedReport) return;
    
    try {
      await fetch(`/api/forum/reports/${selectedReport.id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: resolution.action,
          notes: resolution.notes
        })
      });
      setShowResolutionModal(false);
      fetchReports();
    } catch (error) {
      // Update local state for demo
      setReports(prev => prev.map(r => 
        r.id === selectedReport.id 
          ? { ...r, status: 'resolved', resolution: resolution.notes, resolvedAt: new Date().toISOString() } 
          : r
      ));
      setShowResolutionModal(false);
    }
  };

  const getReasonBadge = (reason: string) => {
    const badges = {
      spam: 'bg-yellow-100 text-yellow-800',
      harassment: 'bg-red-100 text-red-800',
      inappropriate: 'bg-orange-100 text-orange-800',
      misinformation: 'bg-purple-100 text-purple-800',
      copyright: 'bg-blue-100 text-blue-800',
      other: 'bg-gray-100 text-gray-800'
    };
    return badges[reason as keyof typeof badges] || badges.other;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'reviewing': return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'resolved': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'dismissed': return <XCircle className="w-4 h-4 text-gray-500" />;
      default: return null;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-600 font-bold';
      case 'high': return 'text-orange-600 font-semibold';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-gray-600';
      default: return '';
    }
  };

  const filteredReports = reports.filter(report => {
    const matchesSearch = searchTerm === '' || 
      report.postTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.commentContent?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.reporterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.reportedUserName.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch && (filter === 'all' || report.status === filter);
  });

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Forum Reports Management</h1>
        <p className="text-gray-600">Review and manage reported content from the forum</p>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[300px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search reports..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Reports</option>
            <option value="pending">Pending</option>
            <option value="reviewing">Reviewing</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="priority">Priority</option>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-4 gap-4 mt-4">
          <div className="bg-yellow-50 p-3 rounded-lg">
            <div className="text-yellow-600 text-sm">Pending</div>
            <div className="text-2xl font-bold">{reports.filter(r => r.status === 'pending').length}</div>
          </div>
          <div className="bg-orange-50 p-3 rounded-lg">
            <div className="text-orange-600 text-sm">Reviewing</div>
            <div className="text-2xl font-bold">{reports.filter(r => r.status === 'reviewing').length}</div>
          </div>
          <div className="bg-green-50 p-3 rounded-lg">
            <div className="text-green-600 text-sm">Resolved</div>
            <div className="text-2xl font-bold">{reports.filter(r => r.status === 'resolved').length}</div>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-gray-600 text-sm">Dismissed</div>
            <div className="text-2xl font-bold">{reports.filter(r => r.status === 'dismissed').length}</div>
          </div>
        </div>
      </div>

      {/* Reports List */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Content
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Reporter
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Reported User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Reason
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Priority
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredReports.map((report) => (
              <tr key={report.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {report.postId ? (
                      <FileText className="w-4 h-4 text-gray-400 mr-2" />
                    ) : (
                      <MessageSquare className="w-4 h-4 text-gray-400 mr-2" />
                    )}
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {report.postTitle || report.commentContent?.substring(0, 50) + '...'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {report.reportCount} report{report.reportCount > 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <User className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-900">{report.reporterName}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <User className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-900">{report.reportedUserName}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getReasonBadge(report.reason)}`}>
                    {report.reason}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`text-sm ${getPriorityColor(report.priority)}`}>
                    {report.priority.toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {getStatusIcon(report.status)}
                    <span className="ml-2 text-sm text-gray-900">{report.status}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setSelectedReport(report);
                        setShowResolutionModal(true);
                      }}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Review
                    </button>
                    {report.status === 'pending' && (
                      <button
                        onClick={() => handleStatusChange(report.id, 'reviewing')}
                        className="text-yellow-600 hover:text-yellow-900"
                      >
                        Start Review
                      </button>
                    )}
                    {report.status === 'reviewing' && (
                      <>
                        <button
                          onClick={() => handleStatusChange(report.id, 'resolved')}
                          className="text-green-600 hover:text-green-900"
                        >
                          Resolve
                        </button>
                        <button
                          onClick={() => handleStatusChange(report.id, 'dismissed')}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          Dismiss
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Resolution Modal */}
      {showResolutionModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <h2 className="text-xl font-bold mb-4">Review Report</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Content Type
                </label>
                <p className="text-sm text-gray-600">
                  {selectedReport.postId ? 'Forum Post' : 'Comment'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Content
                </label>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                  {selectedReport.postTitle || selectedReport.commentContent}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Report Reason
                </label>
                <p className="text-sm">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getReasonBadge(selectedReport.reason)}`}>
                    {selectedReport.reason}
                  </span>
                </p>
                {selectedReport.reasonDetails && (
                  <p className="text-sm text-gray-600 mt-1">{selectedReport.reasonDetails}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Action
                </label>
                <select
                  value={resolution.action}
                  onChange={(e) => setResolution({ ...resolution, action: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Action</option>
                  <option value="remove_content">Remove Content</option>
                  <option value="warn_user">Warn User</option>
                  <option value="suspend_user">Suspend User</option>
                  <option value="ban_user">Ban User</option>
                  <option value="no_action">No Action Required</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Resolution Notes
                </label>
                <textarea
                  value={resolution.notes}
                  onChange={(e) => setResolution({ ...resolution, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Add notes about the resolution..."
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowResolutionModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleResolve}
                disabled={!resolution.action}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Submit Resolution
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ForumReports;