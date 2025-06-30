import React, { useState, useEffect } from 'react'
import { 
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Copy,
  Settings,
  Upload,
  Download,
  RefreshCw,
  MoreHorizontal,
  Calendar,
  Type,
  Image,
  Hash,
  Check,
  List,
  Link,
  X
} from 'lucide-react'
import { FieldGroup } from '@/types/content'
import { ContentApi } from '@/api/contentApi'
import { Link as RouterLink } from 'react-router-dom'
import toast from 'react-hot-toast'

const AllFieldGroups: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [fieldGroups, setFieldGroups] = useState<FieldGroup[]>([])
  const [filteredGroups, setFilteredGroups] = useState<FieldGroup[]>([])
  const [selectedGroups, setSelectedGroups] = useState<string[]>([])
  
  const [filters, setFilters] = useState({
    searchTerm: '',
    location: '',
    status: ''
  })

  const [showBulkActions, setShowBulkActions] = useState(false)
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0
  })

  useEffect(() => {
    loadFieldGroups()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [fieldGroups, filters])

  const loadFieldGroups = async () => {
    try {
      setLoading(true)
      const response = await ContentApi.getFieldGroups()
      setFieldGroups(response.data)
      calculateStats(response.data)
    } catch (error) {
      console.error('Failed to load field groups:', error)
      toast.error('필드 그룹을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (groupsData: FieldGroup[]) => {
    setStats({
      total: groupsData.length,
      active: groupsData.filter(g => g.active).length,
      inactive: groupsData.filter(g => !g.active).length
    })
  }

  const applyFilters = () => {
    let filtered = [...fieldGroups]

    if (filters.searchTerm) {
      filtered = filtered.filter(group => 
        group.title.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        group.description?.toLowerCase().includes(filters.searchTerm.toLowerCase())
      )
    }

    if (filters.location) {
      filtered = filtered.filter(group => 
        group.location.some(loc => loc.includes(filters.location))
      )
    }

    if (filters.status) {
      if (filters.status === 'active') {
        filtered = filtered.filter(group => group.active)
      } else if (filters.status === 'inactive') {
        filtered = filtered.filter(group => !group.active)
      }
    }

    setFilteredGroups(filtered)
  }

  const handleSelectGroup = (groupId: string) => {
    setSelectedGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    )
  }

  const handleSelectAll = () => {
    if (selectedGroups.length === filteredGroups.length) {
      setSelectedGroups([])
    } else {
      setSelectedGroups(filteredGroups.map(g => g.id))
    }
  }

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm('이 필드 그룹을 삭제하시겠습니까?')) return

    try {
      await ContentApi.deleteFieldGroup(groupId)
      toast.success('필드 그룹이 삭제되었습니다.')
      loadFieldGroups()
    } catch (error) {
      console.error('Failed to delete field group:', error)
      toast.error('필드 그룹 삭제에 실패했습니다.')
    }
  }

  const handleCloneGroup = async (groupId: string) => {
    try {
      const original = fieldGroups.find(g => g.id === groupId)
      if (!original) return

      const clonedGroup = {
        ...original,
        title: `${original.title} (복사본)`,
        id: undefined
      }

      await ContentApi.createFieldGroup(clonedGroup)
      toast.success('필드 그룹이 복제되었습니다.')
      loadFieldGroups()
    } catch (error) {
      console.error('Failed to clone field group:', error)
      toast.error('필드 그룹 복제에 실패했습니다.')
    }
  }

  const handleExport = async () => {
    try {
      const response = await ContentApi.exportFieldGroups(selectedGroups.length > 0 ? selectedGroups : undefined)
      
      // Create download link
      const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `field-groups-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      toast.success('필드 그룹이 내보내기되었습니다.')
    } catch (error) {
      console.error('Failed to export field groups:', error)
      toast.error('필드 그룹 내보내기에 실패했습니다.')
    }
  }

  const getFieldTypeIcon = (type: string) => {
    const icons = {
      text: Type,
      textarea: Type,
      number: Hash,
      email: Type,
      url: Link,
      select: List,
      checkbox: Check,
      radio: Check,
      date: Calendar,
      image: Image,
      file: Upload
    }
    const IconComponent = icons[type as keyof typeof icons] || Type
    return IconComponent
  }

  const getLocationLabel = (location: string) => {
    const labels: Record<string, string> = {
      'post_type_post': '포스트',
      'post_type_page': '페이지',
      'post_type_product': '상품',
      'user': '사용자',
      'taxonomy_category': '카테고리',
      'taxonomy_tag': '태그',
      'options': '옵션',
      'attachment': '미디어'
    }
    return labels[location] || location
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">필드 그룹</h1>
          <p className="text-gray-600 mt-1">커스텀 필드 그룹을 관리합니다.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExport}
            className="wp-button-secondary"
          >
            <Download className="w-4 h-4 mr-2" />
            내보내기
          </button>
          <RouterLink to="/custom-fields/new" className="wp-button-primary">
            <Plus className="w-4 h-4 mr-2" />
            새 필드 그룹
          </RouterLink>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Settings className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">전체 그룹</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <Check className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">활성 그룹</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.active}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 bg-gray-100 rounded-lg">
              <X className="w-6 h-6 text-gray-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">비활성 그룹</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.inactive}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">검색</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="제목 또는 설명 검색..."
                value={filters.searchTerm}
                onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">위치</label>
            <select
              value={filters.location}
              onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">모든 위치</option>
              <option value="post_type_post">포스트</option>
              <option value="post_type_page">페이지</option>
              <option value="post_type_product">상품</option>
              <option value="user">사용자</option>
              <option value="taxonomy_category">카테고리</option>
              <option value="taxonomy_tag">태그</option>
              <option value="options">옵션</option>
              <option value="attachment">미디어</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">상태</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">모든 상태</option>
              <option value="active">활성</option>
              <option value="inactive">비활성</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => setFilters({ searchTerm: '', location: '', status: '' })}
              className="wp-button-secondary w-full"
            >
              <Filter className="w-4 h-4 mr-2" />
              필터 초기화
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedGroups.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm text-blue-700">
                {selectedGroups.length}개 선택됨
              </span>
              <div className="flex gap-2">
                <button
                  onClick={handleExport}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  선택한 항목 내보내기
                </button>
              </div>
            </div>
            <button
              onClick={() => setSelectedGroups([])}
              className="text-blue-600 hover:text-blue-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Field Groups Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedGroups.length === filteredGroups.length && filteredGroups.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  필드 그룹
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  필드
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  위치
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredGroups.map((group) => (
                <tr key={group.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedGroups.includes(group.id)}
                      onChange={() => handleSelectGroup(group.id)}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {group.title}
                      </div>
                      {group.description && (
                        <div className="text-sm text-gray-500">
                          {group.description}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {group.fields.slice(0, 3).map((field, index) => {
                        const IconComponent = getFieldTypeIcon(field.type)
                        return (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                          >
                            <IconComponent className="w-3 h-3 mr-1" />
                            {field.label}
                          </span>
                        )
                      })}
                      {group.fields.length > 3 && (
                        <span className="inline-flex items-center px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                          +{group.fields.length - 3}개 더
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {group.location.slice(0, 2).map((loc, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded"
                        >
                          {getLocationLabel(loc)}
                        </span>
                      ))}
                      {group.location.length > 2 && (
                        <span className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                          +{group.location.length - 2}개 더
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                      group.active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {group.active ? '활성' : '비활성'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <RouterLink
                        to={`/custom-fields/edit/${group.id}`}
                        className="text-blue-600 hover:text-blue-700 p-1"
                        title="편집"
                      >
                        <Edit className="w-4 h-4" />
                      </RouterLink>
                      <button
                        onClick={() => handleCloneGroup(group.id)}
                        className="text-green-600 hover:text-green-700 p-1"
                        title="복제"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteGroup(group.id)}
                        className="text-red-600 hover:text-red-700 p-1"
                        title="삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredGroups.length === 0 && (
          <div className="text-center py-12">
            <Settings className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">필드 그룹이 없습니다</h3>
            <p className="text-gray-500 mb-6">새로운 필드 그룹을 만들어보세요.</p>
            <RouterLink to="/custom-fields/new" className="wp-button-primary">
              <Plus className="w-4 h-4 mr-2" />
              새 필드 그룹 만들기
            </RouterLink>
          </div>
        )}
      </div>
    </div>
  )
}

export default AllFieldGroups