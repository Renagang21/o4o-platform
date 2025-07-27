import { useState, FC } from 'react';
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Search, Edit, Trash2, Eye, MoreVertical, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatDate } from '@/lib/utils'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authClient } from '@o4o/auth-client'
import type { Post, PostStatus } from '@o4o/types'
import toast from 'react-hot-toast'

const PostList: React.FC = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<PostStatus | 'all'>('all')
  const [selectedPosts, setSelectedPosts] = useState<string[]>([])

  // 게시글 목록 조회
  const { data, isLoading, error } = useQuery({
    queryKey: ['posts', statusFilter, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (searchQuery) params.set('search', searchQuery)
      params.set('type', 'post')
      
      const response = await authClient.api.get(`/posts?${params}`)
      return response.data
    }
  })

  // 게시글 삭제
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await authClient.api.delete(`/posts/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      toast.success('게시글이 삭제되었습니다')
    },
    onError: () => {
      toast.error('게시글 삭제에 실패했습니다')
    }
  })

  // 게시글 복제
  const duplicateMutation = useMutation({
    mutationFn: async (id: string) => {
      await authClient.api.post(`/posts/${id}/duplicate`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      toast.success('게시글이 복제되었습니다')
    },
    onError: () => {
      toast.error('게시글 복제에 실패했습니다')
    }
  })

  // 상태별 뱃지 색상
  const getStatusBadge = (status: PostStatus) => {
    switch (status) {
      case 'published':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">게시됨</Badge>
      case 'draft':
        return <Badge variant="secondary">임시저장</Badge>
      case 'scheduled':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">예약됨</Badge>
      case 'trash':
        return <Badge variant="destructive">휴지통</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  // 일괄 작업
  const handleBulkAction = (action: string) => {
    if (selectedPosts.length === 0) {
      toast.error('선택된 게시글이 없습니다')
      return
    }
    
    // TODO: 일괄 작업 구현
    console.log('Bulk action:', action, selectedPosts)
  }

  const posts = data?.posts || []

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">게시글</h1>
          <p className="text-gray-600 mt-1">블로그 게시글을 관리합니다</p>
        </div>
        <Button onClick={() => navigate('/content/posts/new')}>
          <Plus className="w-4 h-4 mr-2" />
          새 게시글
        </Button>
      </div>

      {/* 필터 및 검색 */}
      <div className="wp-card">
        <div className="wp-card-body">
          <div className="flex gap-4 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="게시글 검색..."
                value={searchQuery}
                onChange={(e: any) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as PostStatus | 'all')}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="상태 필터" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 상태</SelectItem>
                <SelectItem value="published">게시됨</SelectItem>
                <SelectItem value="draft">임시저장</SelectItem>
                <SelectItem value="scheduled">예약됨</SelectItem>
                <SelectItem value="trash">휴지통</SelectItem>
              </SelectContent>
            </Select>
            {selectedPosts.length > 0 && (
              <Select onValueChange={handleBulkAction}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="일괄 작업" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="delete">삭제</SelectItem>
                  <SelectItem value="publish">게시</SelectItem>
                  <SelectItem value="draft">임시저장으로 변경</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </div>

      {/* 게시글 목록 */}
      <div className="wp-card">
        <div className="wp-card-body p-0">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-600">
              게시글을 불러오는데 실패했습니다
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">게시글이 없습니다</p>
              <Button onClick={() => navigate('/content/posts/new')}>
                첫 게시글 작성하기
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300"
                      checked={selectedPosts.length === posts.length}
                      onChange={(e: any) => {
                        if (e.target.checked) {
                          setSelectedPosts(posts.map((p: Post) => p.id))
                        } else {
                          setSelectedPosts([])
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead>제목</TableHead>
                  <TableHead>작성자</TableHead>
                  <TableHead>카테고리</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>날짜</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {posts.map((post: Post) => (
                  <TableRow key={post.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        className="rounded border-gray-300"
                        checked={selectedPosts.includes(post.id)}
                        onChange={(e: any) => {
                          if (e.target.checked) {
                            setSelectedPosts([...selectedPosts, post.id])
                          } else {
                            setSelectedPosts(selectedPosts.filter(id => id !== post.id))
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <Link 
                          to={`/content/posts/${post.id}/edit`}
                          className="font-medium text-gray-900 hover:text-gray-700"
                        >
                          {post.title || '(제목 없음)'}
                        </Link>
                        {post.excerpt && (
                          <p className="text-sm text-gray-500 mt-1 line-clamp-1">
                            {post.excerpt}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">{post.author?.name}</div>
                        <div className="text-gray-500">{post.author?.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {post.categories?.map((category) => (
                        <Badge key={category.id} variant="outline" className="mr-1">
                          {category.name}
                        </Badge>
                      )) || '-'}
                    </TableCell>
                    <TableCell>{getStatusBadge(post.status)}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{formatDate(post.publishedAt || post.createdAt)}</div>
                        <div className="text-gray-500">
                          {post.status === 'published' ? '게시됨' : '수정됨'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/content/posts/${post.id}/edit`)}>
                            <Edit className="w-4 h-4 mr-2" />
                            편집
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => window.open(`/post/${post.slug}`, '_blank')}>
                            <Eye className="w-4 h-4 mr-2" />
                            보기
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => duplicateMutation.mutate(post.id)}>
                            <Copy className="w-4 h-4 mr-2" />
                            복제
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => {
                              if (confirm('정말 이 게시글을 삭제하시겠습니까?')) {
                                deleteMutation.mutate(post.id)
                              }
                            }}
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
        </div>
      </div>
    </div>
  )
}

export default PostList