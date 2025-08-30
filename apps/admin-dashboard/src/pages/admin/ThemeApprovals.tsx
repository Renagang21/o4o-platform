/**
 * ThemeApprovals - Admin interface for managing theme customization requests
 */

import React, { useState, useEffect, useCallback } from 'react'
import { 
  Check, 
  X, 
  Eye, 
  Clock, 
  User, 
  Calendar,
  Filter,
  Search,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { ThemeCustomization } from '@o4o/types'
import { zoneApi } from '@/services/api/zoneApi'

interface ThemeApprovalRequest {
  id: string
  userId: string
  userName: string
  userEmail: string
  customization: ThemeCustomization
  status: 'pending' | 'approved' | 'rejected'
  submittedAt: string
  reviewedAt?: string
  reviewedBy?: string
  reviewNote?: string
  changes: {
    branding?: boolean
    colors?: boolean
    navigation?: boolean
    businessInfo?: boolean
  }
}

interface ApprovalFilters {
  status: 'all' | 'pending' | 'approved' | 'rejected'
  dateRange: 'all' | 'today' | 'week' | 'month'
  changes: 'all' | 'branding' | 'colors' | 'navigation' | 'businessInfo'
  search: string
}

// Status badge component
const StatusBadge: React.FC<{ status: ThemeApprovalRequest['status'] }> = ({ status }) => {
  const statusConfig = {
    pending: { icon: Clock, color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
    approved: { icon: CheckCircle, color: 'bg-green-100 text-green-800', label: 'Approved' },
    rejected: { icon: XCircle, color: 'bg-red-100 text-red-800', label: 'Rejected' }
  }

  const config = statusConfig[status]
  const IconComponent = config.icon

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
      <IconComponent size={12} className="mr-1" />
      {config.label}
    </span>
  )
}

// Changes indicator component
const ChangesIndicator: React.FC<{ changes: ThemeApprovalRequest['changes'] }> = ({ changes }) => {
  const changedItems = Object.entries(changes).filter(([, changed]) => changed)
  
  if (changedItems.length === 0) {
    return <span className="text-gray-500 text-sm">No changes</span>
  }

  const changeLabels = {
    branding: 'Branding',
    colors: 'Colors',
    navigation: 'Navigation',
    businessInfo: 'Business Info'
  }

  return (
    <div className="flex flex-wrap gap-1">
      {changedItems.map(([key]) => (
        <span key={key} className="inline-flex px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
          {changeLabels[key as keyof typeof changeLabels]}
        </span>
      ))}
    </div>
  )
}

// Request details modal
const RequestDetailsModal: React.FC<{
  request: ThemeApprovalRequest | null
  onClose: () => void
  onApprove: (id: string, note?: string) => void
  onReject: (id: string, note: string) => void
}> = ({ request, onClose, onApprove, onReject }) => {
  const [reviewNote, setReviewNote] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  if (!request) return null

  const handleApprove = async () => {
    setIsProcessing(true)
    try {
      await onApprove(request.id, reviewNote)
      onClose()
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!reviewNote.trim()) {
      alert('Please provide a reason for rejection')
      return
    }
    
    setIsProcessing(true)
    try {
      await onReject(request.id, reviewNote)
      onClose()
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Theme Customization Request
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
          </div>
          <div className="mt-2 flex items-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center">
              <User size={16} className="mr-1" />
              {request.userName} ({request.userEmail})
            </div>
            <div className="flex items-center">
              <Calendar size={16} className="mr-1" />
              {new Date(request.submittedAt).toLocaleDateString()}
            </div>
            <StatusBadge status={request.status} />
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left side - Request details */}
          <div className="w-1/2 p-6 overflow-y-auto border-r border-gray-200">
            <div className="space-y-6">
              {/* Changes overview */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Requested Changes</h3>
                <ChangesIndicator changes={request.changes} />
              </div>

              {/* Customization details */}
              {request.changes.branding && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Branding</h4>
                  <div className="bg-gray-50 p-3 rounded-md space-y-2 text-sm">
                    {request.customization.branding.siteName && (
                      <div>
                        <span className="font-medium">Site Name:</span> {request.customization.branding.siteName}
                      </div>
                    )}
                    {request.customization.branding.tagline && (
                      <div>
                        <span className="font-medium">Tagline:</span> {request.customization.branding.tagline}
                      </div>
                    )}
                    {request.customization.branding.logo && (
                      <div>
                        <span className="font-medium">Logo:</span>
                        <img 
                          src={request.customization.branding.logo} 
                          alt="Logo" 
                          className="mt-2 h-12 object-contain border rounded"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {request.changes.colors && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Colors</h4>
                  <div className="bg-gray-50 p-3 rounded-md">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {Object.entries(request.customization.colors).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between">
                          <span className="capitalize">{key}:</span>
                          <div className="flex items-center space-x-2">
                            <div 
                              className="w-4 h-4 rounded border"
                              style={{ backgroundColor: value }}
                            />
                            <span className="font-mono text-xs">{value}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {request.changes.businessInfo && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Business Information</h4>
                  <div className="bg-gray-50 p-3 rounded-md space-y-2 text-sm">
                    {request.customization.businessInfo.name && (
                      <div>
                        <span className="font-medium">Business Name:</span> {request.customization.businessInfo.name}
                      </div>
                    )}
                    {request.customization.businessInfo.phone && (
                      <div>
                        <span className="font-medium">Phone:</span> {request.customization.businessInfo.phone}
                      </div>
                    )}
                    {request.customization.businessInfo.email && (
                      <div>
                        <span className="font-medium">Email:</span> {request.customization.businessInfo.email}
                      </div>
                    )}
                    {request.customization.businessInfo.address && (
                      <div>
                        <span className="font-medium">Address:</span> {request.customization.businessInfo.address}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {request.changes.navigation && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Navigation</h4>
                  <div className="bg-gray-50 p-3 rounded-md text-sm">
                    {request.customization.navigation.items.length > 0 ? (
                      <ul className="space-y-1">
                        {request.customization.navigation.items.map((item, index) => (
                          <li key={index} className="flex justify-between">
                            <span>{item.label}</span>
                            <span className="text-gray-500">{item.url}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-gray-500">No navigation items</span>
                    )}
                  </div>
                </div>
              )}

              {/* Review section */}
              {request.status === 'pending' && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Review Note</h4>
                  <textarea
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    placeholder="Add a note about this review (optional for approval, required for rejection)..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                  />
                </div>
              )}

              {/* Previous review */}
              {request.status !== 'pending' && request.reviewNote && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Review Note</h4>
                  <div className="bg-gray-50 p-3 rounded-md text-sm">
                    {request.reviewNote}
                  </div>
                  {request.reviewedBy && request.reviewedAt && (
                    <div className="mt-2 text-xs text-gray-500">
                      Reviewed by {request.reviewedBy} on {new Date(request.reviewedAt).toLocaleString()}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right side - Preview */}
          <div className="w-1/2 p-6">
            <div className="h-full">
              <h3 className="font-medium text-gray-900 mb-3">Theme Preview</h3>
              <div className="border border-gray-200 rounded-lg overflow-hidden h-full">
                <iframe
                  src={`/api/theme/preview?userId=${request.userId}&device=desktop&customization=${encodeURIComponent(JSON.stringify(request.customization))}`}
                  className="w-full h-full border-0"
                  title="Theme Preview"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        {request.status === 'pending' && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
            <button
              onClick={handleReject}
              disabled={isProcessing}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-red-400 flex items-center"
            >
              <X size={16} className="mr-2" />
              {isProcessing ? 'Processing...' : 'Reject'}
            </button>
            <button
              onClick={handleApprove}
              disabled={isProcessing}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-green-400 flex items-center"
            >
              <Check size={16} className="mr-2" />
              {isProcessing ? 'Processing...' : 'Approve'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// Main component
export const ThemeApprovals: React.FC = () => {
  const [requests, setRequests] = useState<ThemeApprovalRequest[]>([])
  const [filteredRequests, setFilteredRequests] = useState<ThemeApprovalRequest[]>([])
  const [selectedRequest, setSelectedRequest] = useState<ThemeApprovalRequest | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<ApprovalFilters>({
    status: 'pending',
    dateRange: 'all',
    changes: 'all',
    search: ''
  })

  // Load approval requests
  useEffect(() => {
    loadApprovalRequests()
  }, [])

  // Filter requests
  useEffect(() => {
    let filtered = requests

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(req => req.status === filters.status)
    }

    // Date filter
    if (filters.dateRange !== 'all') {
      const now = new Date()
      let cutoffDate: Date
      
      switch (filters.dateRange) {
        case 'today':
          cutoffDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          break
        case 'week':
          cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case 'month':
          cutoffDate = new Date(now.getFullYear(), now.getMonth(), 1)
          break
        default:
          cutoffDate = new Date(0)
      }
      
      filtered = filtered.filter(req => new Date(req.submittedAt) >= cutoffDate)
    }

    // Changes filter
    if (filters.changes !== 'all') {
      filtered = filtered.filter(req => req.changes[filters.changes as keyof typeof req.changes])
    }

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(req => 
        req.userName.toLowerCase().includes(searchLower) ||
        req.userEmail.toLowerCase().includes(searchLower) ||
        req.customization.branding.siteName?.toLowerCase().includes(searchLower)
      )
    }

    setFilteredRequests(filtered)
  }, [requests, filters])

  const loadApprovalRequests = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      // TODO: Replace with actual API call
      const mockRequests: ThemeApprovalRequest[] = [
        {
          id: '1',
          userId: 'user1',
          userName: 'John Doe',
          userEmail: 'john@example.com',
          customization: {
            id: 'custom1',
            userId: 'user1',
            name: 'John\'s Theme',
            branding: {
              siteName: 'John\'s Business',
              tagline: 'Quality Service Provider',
              logo: null,
              favicon: null
            },
            colors: {
              primary: '#2563EB',
              secondary: '#64748B',
              accent: '#059669',
              background: '#FFFFFF',
              foreground: '#1F2937',
              muted: '#F1F5F9',
              mutedForeground: '#64748B',
              border: '#E2E8F0',
              input: '#FFFFFF',
              ring: '#2563EB'
            },
            businessInfo: {
              name: 'John\'s Business',
              description: 'We provide quality services',
              phone: '+1-555-0123',
              email: 'contact@johnsbusiness.com',
              address: '123 Main St, City, State 12345',
              website: '',
              socialMedia: {},
              businessHours: {}
            },
            navigation: {
              items: [
                { id: '1', label: 'Home', url: '/', children: [] },
                { id: '2', label: 'Services', url: '/services', children: [] },
                { id: '3', label: 'Contact', url: '/contact', children: [] }
              ],
              showHome: true,
              sticky: true
            },
            isActive: false,
            isApproved: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          status: 'pending',
          submittedAt: new Date().toISOString(),
          changes: {
            branding: true,
            colors: true,
            navigation: true,
            businessInfo: true
          }
        }
        // Add more mock requests as needed
      ]
      
      setRequests(mockRequests)
    } catch (error) {
      console.error('Failed to load approval requests:', error)
      setError('Failed to load approval requests')
    } finally {
      setIsLoading(false)
    }
  }

  const handleApprove = useCallback(async (requestId: string, note?: string) => {
    try {
      // TODO: Implement actual approval API call
      console.log('Approving request:', requestId, note)
      
      setRequests(prev => prev.map(req => 
        req.id === requestId 
          ? { 
              ...req, 
              status: 'approved' as const,
              reviewedAt: new Date().toISOString(),
              reviewedBy: 'Admin User', // TODO: Get from current user context
              reviewNote: note
            }
          : req
      ))
    } catch (error) {
      console.error('Failed to approve request:', error)
      alert('Failed to approve request')
    }
  }, [])

  const handleReject = useCallback(async (requestId: string, note: string) => {
    try {
      // TODO: Implement actual rejection API call
      console.log('Rejecting request:', requestId, note)
      
      setRequests(prev => prev.map(req => 
        req.id === requestId 
          ? { 
              ...req, 
              status: 'rejected' as const,
              reviewedAt: new Date().toISOString(),
              reviewedBy: 'Admin User', // TODO: Get from current user context
              reviewNote: note
            }
          : req
      ))
    } catch (error) {
      console.error('Failed to reject request:', error)
      alert('Failed to reject request')
    }
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading approval requests...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadApprovalRequests}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="theme-approvals h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="header bg-white border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Theme Approvals</h1>
            <p className="text-gray-600 mt-1">Review and manage theme customization requests</p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Status summary */}
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center">
                <Clock size={16} className="text-yellow-600 mr-1" />
                <span>{requests.filter(r => r.status === 'pending').length} Pending</span>
              </div>
              <div className="flex items-center">
                <CheckCircle size={16} className="text-green-600 mr-1" />
                <span>{requests.filter(r => r.status === 'approved').length} Approved</span>
              </div>
              <div className="flex items-center">
                <XCircle size={16} className="text-red-600 mr-1" />
                <span>{requests.filter(r => r.status === 'rejected').length} Rejected</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters bg-white border-b border-gray-200 p-4">
        <div className="flex items-center space-x-4">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by user name, email, or site name..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Status filter */}
          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as ApprovalFilters['status'] }))}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>

          {/* Date range filter */}
          <select
            value={filters.dateRange}
            onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value as ApprovalFilters['dateRange'] }))}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>

          {/* Changes filter */}
          <select
            value={filters.changes}
            onChange={(e) => setFilters(prev => ({ ...prev, changes: e.target.value as ApprovalFilters['changes'] }))}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Changes</option>
            <option value="branding">Branding</option>
            <option value="colors">Colors</option>
            <option value="navigation">Navigation</option>
            <option value="businessInfo">Business Info</option>
          </select>
        </div>
      </div>

      {/* Requests list */}
      <div className="requests-list flex-1 overflow-auto p-6">
        {filteredRequests.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No requests found</h3>
            <p className="text-gray-600">
              {requests.length === 0 
                ? 'No theme customization requests have been submitted yet.'
                : 'Try adjusting your filters to see more requests.'
              }
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredRequests.map(request => (
              <div
                key={request.id}
                className="request-card bg-white rounded-lg border border-gray-200 p-6 hover:border-gray-300 transition-colors cursor-pointer"
                onClick={() => setSelectedRequest(request)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-medium text-gray-900">
                          {request.customization.branding.siteName || 'Untitled'}
                        </h3>
                        <StatusBadge status={request.status} />
                      </div>
                      <button className="text-blue-600 hover:text-blue-700 flex items-center text-sm">
                        <Eye size={16} className="mr-1" />
                        View Details
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <div className="text-sm text-gray-500 mb-1">Submitted by</div>
                        <div className="font-medium">{request.userName}</div>
                        <div className="text-sm text-gray-500">{request.userEmail}</div>
                      </div>
                      
                      <div>
                        <div className="text-sm text-gray-500 mb-1">Changes</div>
                        <ChangesIndicator changes={request.changes} />
                      </div>
                      
                      <div>
                        <div className="text-sm text-gray-500 mb-1">Submitted</div>
                        <div className="font-medium">
                          {new Date(request.submittedAt).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(request.submittedAt).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <ChevronRight size={20} className="text-gray-400 ml-4" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Request details modal */}
      <RequestDetailsModal
        request={selectedRequest}
        onClose={() => setSelectedRequest(null)}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </div>
  )
}

export default ThemeApprovals