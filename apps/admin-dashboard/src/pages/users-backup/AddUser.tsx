import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Save, ArrowLeft, User, Mail, Building } from 'lucide-react'
import { UserFormData, UserRole, ROLE_LABELS, BUSINESS_TYPES } from '@/types/user'
import { UserApi } from '@/api/userApi'
import toast from 'react-hot-toast'
import { AxiosError } from 'axios'

const AddUser: React.FC = () => {
  const { userId } = useParams()
  const navigate = useNavigate()
  const isEditMode = Boolean(userId)
  
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<UserFormData>({
    name: '',
    email: '',
    role: 'customer',
    password: '',
    sendWelcomeEmail: true
  })

  useEffect(() => {
    if (isEditMode && userId) {
      loadUser(userId)
    }
  }, [userId, isEditMode])

  const loadUser = async (id: string) => {
    try {
      setLoading(true)
      const response = await UserApi.getUser(id)
      const user = response.data
      setFormData({
        name: user.name,
        email: user.email,
        role: user.role,
        businessInfo: user.businessInfo,
        sendWelcomeEmail: false
      })
    } catch (error) {
      console.error('Failed to load user:', error)
      toast.error('사용자 정보를 불러오는데 실패했습니다.')
      navigate('/users')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim() || !formData.email.trim()) {
      toast.error('이름과 이메일을 입력해주세요.')
      return
    }

    if (!isEditMode && !formData.password) {
      toast.error('비밀번호를 입력해주세요.')
      return
    }

    try {
      setLoading(true)
      
      if (isEditMode && userId) {
        await UserApi.updateUser(userId, formData)
        toast.success('사용자 정보가 수정되었습니다.')
      } else {
        await UserApi.createUser(formData)
        toast.success('사용자가 생성되었습니다.')
      }
      
      navigate('/users')
    } catch (error) {
      console.error('Failed to save user:', error)
      const axiosError = error as AxiosError<{ message?: string }>
      toast.error(axiosError.response?.data?.message || '저장에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const updateFormData = (field: keyof UserFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const updateBusinessInfo = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      businessInfo: {
        ...prev.businessInfo,
        [field]: value
      }
    }))
  }

  const needsBusinessInfo = formData.role === 'business' || formData.role === 'affiliate'

  if (loading && isEditMode) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="loading-spinner" />
        <span className="ml-2 text-gray-600">사용자 정보를 불러오는 중...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/users')}
          className="wp-button-secondary"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          돌아가기
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditMode ? '사용자 수정' : '새 사용자 추가'}
          </h1>
          <p className="text-gray-600 mt-1">
            {isEditMode ? '사용자 정보를 수정합니다' : '새로운 사용자를 추가합니다'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 기본 정보 */}
        <div className="wp-card">
          <div className="wp-card-header">
            <h3 className="wp-card-title">
              <User className="w-5 h-5 mr-2" />
              기본 정보
            </h3>
          </div>
          <div className="wp-card-body space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  이름 *
                </label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => updateFormData('name', e.target.value)}
                  className="wp-input"
                  required
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  이메일 *
                </label>
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateFormData('email', e.target.value)}
                  className="wp-input"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                  역할 *
                </label>
                <select
                  id="role"
                  value={formData.role}
                  onChange={(e) => updateFormData('role', e.target.value as UserRole)}
                  className="wp-select"
                  required
                >
                  {Object.entries(ROLE_LABELS).map(([role, label]) => (
                    <option key={role} value={role}>{label}</option>
                  ))}
                </select>
              </div>

              {!isEditMode && (
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    비밀번호 *
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={formData.password || ''}
                    onChange={(e) => updateFormData('password', e.target.value)}
                    className="wp-input"
                    required={!isEditMode}
                    minLength={8}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    최소 8자 이상 입력해주세요
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 사업체 정보 (사업자/파트너인 경우) */}
        {needsBusinessInfo && (
          <div className="wp-card">
            <div className="wp-card-header">
              <h3 className="wp-card-title">
                <Building className="w-5 h-5 mr-2" />
                사업체 정보
              </h3>
            </div>
            <div className="wp-card-body space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="businessName" className="block text-sm font-medium text-gray-700 mb-1">
                    사업체명 *
                  </label>
                  <input
                    id="businessName"
                    type="text"
                    value={formData.businessInfo?.businessName || ''}
                    onChange={(e) => updateBusinessInfo('businessName', e.target.value)}
                    className="wp-input"
                    required={needsBusinessInfo}
                  />
                </div>

                <div>
                  <label htmlFor="businessType" className="block text-sm font-medium text-gray-700 mb-1">
                    사업체 유형 *
                  </label>
                  <select
                    id="businessType"
                    value={formData.businessInfo?.businessType || ''}
                    onChange={(e) => updateBusinessInfo('businessType', e.target.value)}
                    className="wp-select"
                    required={needsBusinessInfo}
                  >
                    <option value="">사업체 유형 선택</option>
                    {BUSINESS_TYPES.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="businessNumber" className="block text-sm font-medium text-gray-700 mb-1">
                    사업자등록번호
                  </label>
                  <input
                    id="businessNumber"
                    type="text"
                    value={formData.businessInfo?.businessNumber || ''}
                    onChange={(e) => updateBusinessInfo('businessNumber', e.target.value)}
                    className="wp-input"
                    placeholder="000-00-00000"
                  />
                </div>

                <div>
                  <label htmlFor="representativeName" className="block text-sm font-medium text-gray-700 mb-1">
                    대표자명
                  </label>
                  <input
                    id="representativeName"
                    type="text"
                    value={formData.businessInfo?.representativeName || ''}
                    onChange={(e) => updateBusinessInfo('representativeName', e.target.value)}
                    className="wp-input"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="businessAddress" className="block text-sm font-medium text-gray-700 mb-1">
                  사업장 주소
                </label>
                <input
                  id="businessAddress"
                  type="text"
                  value={formData.businessInfo?.businessAddress || ''}
                  onChange={(e) => updateBusinessInfo('businessAddress', e.target.value)}
                  className="wp-input"
                />
              </div>
            </div>
          </div>
        )}

        {/* 추가 옵션 */}
        {!isEditMode && (
          <div className="wp-card">
            <div className="wp-card-header">
              <h3 className="wp-card-title">
                <Mail className="w-5 h-5 mr-2" />
                이메일 설정
              </h3>
            </div>
            <div className="wp-card-body">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.sendWelcomeEmail}
                  onChange={(e) => updateFormData('sendWelcomeEmail', e.target.checked)}
                  className="rounded border-gray-300 text-admin-blue focus:ring-admin-blue"
                />
                <span className="text-sm text-gray-700">
                  환영 이메일 발송 (로그인 정보 포함)
                </span>
              </label>
            </div>
          </div>
        )}

        {/* 저장 버튼 */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/users')}
            className="wp-button-secondary"
          >
            취소
          </button>
          
          <button
            type="submit"
            disabled={loading}
            className="wp-button-primary"
          >
            {loading ? (
              <>
                <div className="loading-spinner w-4 h-4 mr-2" />
                저장 중...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {isEditMode ? '수정하기' : '추가하기'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

export default AddUser