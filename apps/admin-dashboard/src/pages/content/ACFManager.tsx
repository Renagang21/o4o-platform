import { FC } from 'react';
import { useNavigate } from 'react-router-dom'
import { 
  Plus, 
  Settings2, 
  Trash2, 
  Edit2,
  Copy,
  MoreVertical,
  Package,
  Eye,
  EyeOff,
  Database,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authClient } from '@o4o/auth-client'
import type { ACFFieldGroup } from '@o4o/types'
import toast from 'react-hot-toast'

const ACFManager: FC = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Fetch field groups
  const { data: fieldGroups = [], isLoading } = useQuery({
    queryKey: ['acf-field-groups'],
    queryFn: async () => {
      const response = await authClient.api.get('/v1/acf/field-groups')
      return response.data
    }
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return authClient.api.delete(`/v1/acf/field-groups/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['acf-field-groups'] })
      toast.success('필드 그룹이 삭제되었습니다')
    },
    onError: () => {
      toast.error('삭제에 실패했습니다')
    }
  })

  // Duplicate mutation
  const duplicateMutation = useMutation({
    mutationFn: async (id: string) => {
      return authClient.api.post(`/v1/acf/field-groups/${id}/duplicate`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['acf-field-groups'] })
      toast.success('필드 그룹이 복제되었습니다')
    },
    onError: () => {
      toast.error('복제에 실패했습니다')
    }
  })

  const handleDelete = (fieldGroup: ACFFieldGroup) => {
    if (confirm(`정말 "${fieldGroup.name}" 필드 그룹을 삭제하시겠습니까?`)) {
      deleteMutation.mutate(fieldGroup.id)
    }
  }

  const getLocationDescription = (fieldGroup: ACFFieldGroup) => {
    if (!fieldGroup.location || fieldGroup.location.length === 0) {
      return '위치 설정 없음'
    }

    const firstRule = fieldGroup.location[0]?.rules[0]
    if (!firstRule) return '위치 설정 없음'

    const locationLabels: Record<string, string> = {
      post_type: '게시물 유형',
      page_template: '페이지 템플릿',
      post_status: '게시물 상태',
      post_category: '카테고리',
      taxonomy: '분류',
      user_role: '사용자 역할',
    }

    return `${locationLabels[firstRule.param] || firstRule.param} ${firstRule.operator} ${firstRule.value}`
  }

  const getFieldCount = (fieldGroup: ACFFieldGroup) => {
    return fieldGroup.fields.reduce((count: any, field: any) => {
      if (field.type === 'repeater' || field.type === 'group' || field.type === 'flexible_content') {
        // Count sub-fields for complex field types
        return count + 1 + ((field as any).subFields?.length || 0)
      }
      return count + 1
    }, 0)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Advanced Custom Fields</h1>
          <p className="text-gray-600 mt-1">고급 커스텀 필드 그룹을 생성하고 관리합니다</p>
        </div>
        <Button onClick={() => navigate('/content/acf/new')}>
          <Plus className="w-4 h-4 mr-2" />
          새 필드 그룹
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {fieldGroups.map((fieldGroup: ACFFieldGroup) => (
            <Card key={fieldGroup.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{fieldGroup.name}</CardTitle>
                    <p className="text-sm text-gray-500 mt-1">
                      {getLocationDescription(fieldGroup)}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant={"ghost" as const} size={"sm" as const}>
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => navigate(`/content/acf/${fieldGroup.id}/edit`)}>
                        <Edit2 className="w-4 h-4 mr-2" />
                        편집
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => duplicateMutation.mutate(fieldGroup.id)}>
                        <Copy className="w-4 h-4 mr-2" />
                        복제
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => handleDelete(fieldGroup)}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        삭제
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                {fieldGroup.description && (
                  <p className="text-sm text-gray-600 mb-4">
                    {fieldGroup.description}
                  </p>
                )}
                
                <div className="space-y-3">
                  {/* Field Count */}
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      {getFieldCount(fieldGroup)}개 필드
                    </span>
                  </div>

                  {/* Status */}
                  <div className="flex items-center gap-2">
                    {fieldGroup.active !== false ? (
                      <>
                        <Eye className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-green-600">활성</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-400">비활성</span>
                      </>
                    )}
                  </div>

                  {/* Style */}
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      {fieldGroup.style === 'seamless' ? '심리스' : '기본'} 스타일
                    </span>
                  </div>

                  {/* Position */}
                  <div className="flex flex-wrap gap-1">
                    <Badge variant={"outline" as const} className="text-xs">
                      {fieldGroup.position || 'normal'}
                    </Badge>
                    {fieldGroup.labelPlacement && (
                      <Badge variant={"outline" as const} className="text-xs">
                        레이블 {fieldGroup.labelPlacement === 'top' ? '상단' : '왼쪽'}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 mt-4 border-t">
                  <span className="text-xs text-gray-500">
                    {fieldGroup.updatedAt ? new Date(fieldGroup.updatedAt).toLocaleDateString() : ''}
                  </span>
                  <Button
                    variant={"outline" as const}
                    size={"sm" as const}
                    onClick={() => navigate(`/content/acf/${fieldGroup.id}/edit`)}
                  >
                    <Settings2 className="w-4 h-4 mr-2" />
                    필드 관리
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Add New Card */}
          <Card className="border-dashed border-2 hover:border-gray-400 transition-colors cursor-pointer"
                onClick={() => navigate('/content/acf/new')}>
            <CardContent className="flex flex-col items-center justify-center h-full min-h-[300px] text-center">
              <div className="p-3 bg-gray-100 rounded-full mb-4">
                <Plus className="w-8 h-8 text-gray-600" />
              </div>
              <h3 className="font-medium text-gray-900 mb-2">새 필드 그룹 추가</h3>
              <p className="text-sm text-gray-500">
                고급 커스텀 필드로<br />
                더 강력한 콘텐츠를 만드세요
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

export default ACFManager