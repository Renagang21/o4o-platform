import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom'
import { 
  Plus, 
  Search, 
  Filter,
  MoreVertical,
  Edit2,
  Trash2,
  Eye,
  Copy,
  Calendar,
  User,
  Folder
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authClient } from '@o4o/auth-client'
import type { Post, PostStatus, CustomPostType } from '@o4o/types'
import toast from 'react-hot-toast'

const DynamicContentList: React.FC = () => {
  const navigate = useNavigate()
  const { slug } = useParams()
  const queryClient = useQueryClient()

  const [selectedPosts, setSelectedPosts] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<PostStatus | 'all'>('all')
  const [page, setPage] = useState(1)
  const limit = 20

  // Fetch custom post type info
  const { data: customPostTypes } = useQuery({
    queryKey: ['custom-post-types'],
    queryFn: async () => {
      const response = await authClient.api.get('/custom-post-types')
      return response.data
    }
  })

  const currentCPT = customPostTypes?.find((cpt: CustomPostType) => cpt.slug === slug)

  // Fetch posts
  const { data, isLoading } = useQuery({
    queryKey: ['posts', slug, { status: statusFilter, search: searchQuery, page, limit }],
    queryFn: async () => {
      const params = new URLSearchParams({
        post_type: slug || '',
        page: page.toString(),
        limit: limit.toString(),
      })
      
      if (statusFilter !== 'all') {
        params.append('status', statusFilter)
      }
      
      if (searchQuery) {
        params.append('search', searchQuery)
      }

      const response = await authClient.api.get(`/posts?${params}`)
      return response.data
    },
    enabled: !!slug
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return authClient.api.delete(`/posts/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts', slug] })
      toast.success('콘텐츠가 삭제되었습니다')
    },
    onError: () => {
      toast.error('삭제에 실패했습니다')
    }
  })

  const handleDelete = (post: Post) => {
    if (confirm(`정말 "${post.title}"을(를) 삭제하시겠습니까?`)) {
      deleteMutation.mutate(post.id)
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedPosts(data?.posts?.map((post: Post) => post.id) || [])
    } else {
      setSelectedPosts([])
    }
  }

  const togglePostSelection = (postId: string) => {
    setSelectedPosts(prev =>
      prev.includes(postId)
        ? prev.filter(id => id !== postId)
        : [...prev, postId]
    )
  }

  const getStatusColor = (status: PostStatus) => {
    switch (status) {
      case 'published':
        return 'success'
      case 'draft':
        return 'secondary'
      case 'scheduled':
        return 'warning'
      case 'trash':
        return 'destructive'
      default:
        return 'default'
    }
  }

  const getStatusLabel = (status: PostStatus) => {
    switch (status) {
      case 'published':
        return '공개됨'
      case 'draft':
        return '임시저장'
      case 'scheduled':
        return '예약됨'
      case 'trash':
        return '휴지통'
      default:
        return status
    }
  }

  if (!slug) {
    return <div>콘텐츠 유형을 찾을 수 없습니다</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {currentCPT?.pluralName || slug}
          </h1>
          {currentCPT?.description && (
            <p className="text-gray-600 mt-1">{currentCPT.description}</p>
          )}
        </div>
        <Button onClick={() => navigate(`/content/${slug}/new`)}>
          <Plus className="w-4 h-4 mr-2" />
          새 {currentCPT?.singularName || '항목'} 추가
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="제목, 내용으로 검색..."
            value={searchQuery}
            onChange={(e: any) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as PostStatus | 'all')}>
          <SelectTrigger className="w-[180px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="상태 필터" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">모든 상태</SelectItem>
            <SelectItem value="published">공개됨</SelectItem>
            <SelectItem value="draft">임시저장</SelectItem>
            <SelectItem value="scheduled">예약됨</SelectItem>
            <SelectItem value="trash">휴지통</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Content Table */}
      <div className="bg-white rounded-lg shadow">
        {selectedPosts.length > 0 && (
          <div className="p-4 border-b bg-gray-50">
            <span className="text-sm text-gray-600">
              {selectedPosts.length}개 선택됨
            </span>
            <Button
              variant="outline"
              size="sm"
              className="ml-4"
              onClick={() => {/* Bulk actions */}}
            >
              일괄 작업
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedPosts.length === data?.posts?.length && data?.posts?.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>제목</TableHead>
                <TableHead>작성자</TableHead>
                <TableHead>카테고리</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>날짜</TableHead>
                <TableHead className="text-right">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.posts?.map((post: Post) => (
                <TableRow key={post.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedPosts.includes(post.id)}
                      onCheckedChange={() => togglePostSelection(post.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{post.title}</div>
                      {post.excerpt && (
                        <p className="text-sm text-gray-500 line-clamp-1">{post.excerpt}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">{post.author?.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {post.categories && post.categories.length > 0 ? (
                      <div className="flex items-center gap-1">
                        <Folder className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">{post.categories[0].name}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(post.status) as "default" | "secondary" | "destructive" | "outline"}>
                      {getStatusLabel(post.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Calendar className="w-4 h-4" />
                      {new Date(post.updatedAt).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/content/${slug}/${post.id}/edit`)}>
                          <Edit2 className="w-4 h-4 mr-2" />
                          편집
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => window.open(`/${slug}/${post.slug}`, '_blank')}>
                          <Eye className="w-4 h-4 mr-2" />
                          보기
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {/* Duplicate logic */}}>
                          <Copy className="w-4 h-4 mr-2" />
                          복제
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleDelete(post)}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          삭제
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {data?.posts?.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            <p>아직 {currentCPT?.pluralName || '콘텐츠'}가 없습니다.</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => navigate(`/content/${slug}/new`)}
            >
              <Plus className="w-4 h-4 mr-2" />
              첫 {currentCPT?.singularName || '항목'} 만들기
            </Button>
          </div>
        )}

        {/* Pagination */}
        {data?.totalPages > 1 && (
          <div className="p-4 border-t flex items-center justify-between">
            <span className="text-sm text-gray-700">
              총 {data.total}개 중 {(page - 1) * limit + 1}-{Math.min(page * limit, data.total)}개 표시
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
              >
                이전
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page === data.totalPages}
              >
                다음
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default DynamicContentList