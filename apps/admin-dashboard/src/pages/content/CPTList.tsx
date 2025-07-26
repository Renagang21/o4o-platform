import { useState, useEffect, useCallback, useMemo, useRef, Fragment, FC } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Settings2, 
  FileText, 
  MoreVertical,
  Package,
  Eye,
  EyeOff,
  Database
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
import type { CustomPostType } from '@o4o/types'
import toast from 'react-hot-toast'

const CPTList: FC = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Fetch custom post types
  const { data: postTypes = [], isLoading } = useQuery({
    queryKey: ['custom-post-types'],
    queryFn: async () => {
      const response = await authClient.api.get('/v1/custom-post-types')
      return response.data
    }
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return authClient.api.delete(`/v1/custom-post-types/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-post-types'] })
      toast.success('사용자 정의 게시물 유형이 삭제되었습니다')
    },
    onError: () => {
      toast.error('삭제에 실패했습니다')
    }
  })

  const handleDelete = (postType: CustomPostType) => {
    if (confirm(`정말 "${postType.name}"을(를) 삭제하시겠습니까?\n이 유형의 모든 게시물도 함께 삭제됩니다.`)) {
      deleteMutation.mutate(postType.id)
    }
  }

  // Get support features as badges
  const getSupportBadges = (supports: CustomPostType['supports']) => {
    const features = []
    if (supports.title) features.push('제목')
    if (supports.editor) features.push('에디터')
    if (supports.thumbnail) features.push('대표 이미지')
    if (supports.customFields) features.push('커스텀 필드')
    if (supports.comments) features.push('댓글')
    return features
  }


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">사용자 정의 게시물 유형</h1>
          <p className="text-gray-600 mt-1">다양한 콘텐츠 유형을 생성하고 관리합니다</p>
        </div>
        <Button onClick={() => navigate('/content/cpt/new')}>
          <Plus className="w-4 h-4 mr-2" />
          새 게시물 유형
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Default Post Types */}
          <Card className="border-gray-300">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">게시글</CardTitle>
                    <p className="text-sm text-gray-500">post</p>
                  </div>
                </div>
                <Badge variant="secondary">기본</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                블로그 게시글과 뉴스를 위한 기본 게시물 유형
              </p>
              <div className="flex flex-wrap gap-1 mb-4">
                {['제목', '에디터', '카테고리', '태그', '대표 이미지'].map(feature => (
                  <Badge key={feature} variant="outline" className="text-xs">
                    {feature}
                  </Badge>
                ))}
              </div>
              <div className="flex items-center justify-between pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/content/posts')}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  게시글 관리
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-300">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <FileText className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">페이지</CardTitle>
                    <p className="text-sm text-gray-500">page</p>
                  </div>
                </div>
                <Badge variant="secondary">기본</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                정적 페이지를 위한 기본 게시물 유형
              </p>
              <div className="flex flex-wrap gap-1 mb-4">
                {['제목', '에디터', '페이지 속성', '대표 이미지'].map(feature => (
                  <Badge key={feature} variant="outline" className="text-xs">
                    {feature}
                  </Badge>
                ))}
              </div>
              <div className="flex items-center justify-between pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/content/pages')}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  페이지 관리
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Custom Post Types */}
          {postTypes.map((postType: CustomPostType) => (
            <Card key={postType.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      {postType.icon ? (
                        <span className="text-2xl">{postType.icon}</span>
                      ) : (
                        <Package className="w-6 h-6 text-purple-600" />
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{postType.pluralName}</CardTitle>
                      <p className="text-sm text-gray-500">{postType.slug}</p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => navigate(`/content/cpt/${postType.id}/edit`)}>
                        <Edit2 className="w-4 h-4 mr-2" />
                        편집
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate(`/content/cpt/${postType.id}/fields`)}>
                        <Database className="w-4 h-4 mr-2" />
                        필드 관리
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate(`/content/${postType.slug}`)}>
                        <Eye className="w-4 h-4 mr-2" />
                        콘텐츠 보기
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => handleDelete(postType)}
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
                {postType.description && (
                  <p className="text-sm text-gray-600 mb-4">
                    {postType.description}
                  </p>
                )}
                
                <div className="space-y-3">
                  {/* Visibility */}
                  <div className="flex items-center gap-2">
                    {postType.isPublic ? (
                      <Eye className="w-4 h-4 text-green-600" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-gray-400" />
                    )}
                    <span className="text-sm">
                      {postType.isPublic ? '공개' : '비공개'}
                    </span>
                  </div>

                  {/* Supported Features */}
                  <div className="flex flex-wrap gap-1">
                    {getSupportBadges(postType.supports).map(feature => (
                      <Badge key={feature} variant="outline" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                  </div>

                  {/* Custom Fields Count */}
                  {postType.fieldGroups.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Settings2 className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600">
                        {postType.fieldGroups.reduce((acc: any, group: any) => acc + group.fields.length, 0)}개 커스텀 필드
                      </span>
                    </div>
                  )}

                  {/* Taxonomies */}
                  {postType.taxonomies.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {postType.taxonomies.map(taxonomy => (
                        <Badge key={taxonomy} variant="secondary" className="text-xs">
                          {taxonomy}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 mt-4 border-t">
                  <span className="text-xs text-gray-500">
                    {new Date(postType.createdAt).toLocaleDateString()}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/content/${postType.slug}`)}
                  >
                    콘텐츠 관리
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Add New Card */}
          <Card className="border-dashed border-2 hover:border-gray-400 transition-colors cursor-pointer"
                onClick={() => navigate('/content/cpt/new')}>
            <CardContent className="flex flex-col items-center justify-center h-full min-h-[300px] text-center">
              <div className="p-3 bg-gray-100 rounded-full mb-4">
                <Plus className="w-8 h-8 text-gray-600" />
              </div>
              <h3 className="font-medium text-gray-900 mb-2">새 게시물 유형 추가</h3>
              <p className="text-sm text-gray-500">
                제품, 포트폴리오, 이벤트 등<br />
                다양한 콘텐츠 유형을 만들어보세요
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

export default CPTList