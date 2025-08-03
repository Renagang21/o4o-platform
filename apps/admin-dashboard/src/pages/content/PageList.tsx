import { useState, FC } from 'react';
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Search, Edit, Trash2, Eye, MoreVertical, Copy, Home } from 'lucide-react'
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

const PageList: FC = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<PostStatus | 'all'>('all')
  const [selectedPages, setSelectedPages] = useState([])

  // 페이지 목록 조회
  const { data, isLoading, error } = useQuery({
    queryKey: ['pages', statusFilter, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (searchQuery) params.set('search', searchQuery)
      params.set('type', 'page')
      
      const response = await authClient.api.get(`/posts?${params}`)
      return response.data
    }
  })

  // 페이지 삭제
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await authClient.api.delete(`/posts/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pages'] })
      toast.success('페이지가 삭제되었습니다')
    },
    onError: () => {
      toast.error('페이지 삭제에 실패했습니다')
    }
  })

  // 페이지 복제
  const duplicateMutation = useMutation({
    mutationFn: async (id: string) => {
      await authClient.api.post(`/posts/${id}/duplicate`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pages'] })
      toast.success('페이지가 복제되었습니다')
    },
    onError: () => {
      toast.error('페이지 복제에 실패했습니다')
    }
  })

  // 홈페이지로 설정
  const setAsHomeMutation = useMutation({
    mutationFn: async (id: string) => {
      await authClient.api.post(`/settings/homepage`, { pageId: id })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pages'] })
      toast.success('홈페이지로 설정되었습니다')
    },
    onError: () => {
      toast.error('홈페이지 설정에 실패했습니다')
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
    if (selectedPages.length === 0) {
      toast.error('선택된 페이지가 없습니다')
      return
    }
    
    // TODO: 일괄 작업 구현
    // console.log('Bulk action:', action, selectedPages)
  }

  const pages = data?.posts || []

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">페이지</h1>
          <p className="text-gray-600 mt-1">사이트의 정적 페이지를 관리합니다</p>
        </div>
        <Button onClick={() => navigate('/content/pages/new')}>
          <Plus className="w-4 h-4 mr-2" />
          새 페이지
        </Button>
      </div>

      {/* 필터 및 검색 */}
      <div className="wp-card">
        <div className="wp-card-body">
          <div className="flex gap-4 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="페이지 검색..."
                value={searchQuery}
                onChange={(e: any) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={(value: string) => setStatusFilter(value as PostStatus | 'all')}>
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
            {selectedPages.length > 0 && (
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

      {/* 페이지 목록 */}
      <div className="wp-card">
        <div className="wp-card-body p-0">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-600">
              페이지를 불러오는데 실패했습니다
            </div>
          ) : pages.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">페이지가 없습니다</p>
              <Button onClick={() => navigate('/content/pages/new')}>
                첫 페이지 만들기
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
                      checked={selectedPages.length === pages.length}
                      onChange={(e: any) => {
                        if (e.target.checked) {
                          setSelectedPages(pages.map((p: Post) => p.id))
                        } else {
                          setSelectedPages([])
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead>제목</TableHead>
                  <TableHead>작성자</TableHead>
                  <TableHead>템플릿</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>날짜</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pages.map((page: Post & { isHomepage?: boolean; template?: string }) => (
                  <TableRow key={page.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        className="rounded border-gray-300"
                        checked={selectedPages.includes(page.id)}
                        onChange={(e: any) => {
                          if (e.target.checked) {
                            setSelectedPages([...selectedPages, page.id])
                          } else {
                            setSelectedPages(selectedPages.filter(id => id !== page.id))
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div>
                          <Link 
                            to={`/content/pages/${page.id}/edit`}
                            className="font-medium text-gray-900 hover:text-gray-700"
                          >
                            {page.title || '(제목 없음)'}
                          </Link>
                          {page.slug && (
                            <p className="text-sm text-gray-500">/{page.slug}</p>
                          )}
                        </div>
                        {page.isHomepage && (
                          <Badge variant={"outline" as const} className="flex items-center gap-1">
                            <Home className="w-3 h-3" />
                            홈
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">{page.author?.name}</div>
                        <div className="text-gray-500">{page.author?.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {page.template ? (
                        <Badge variant={"outline" as const}>{page.template}</Badge>
                      ) : (
                        <span className="text-gray-500">기본</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(page.status)}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{formatDate(page.publishedAt || page.createdAt)}</div>
                        <div className="text-gray-500">
                          {page.status === 'published' ? '게시됨' : '수정됨'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger>
                          <Button variant={"ghost" as const} size={"sm" as const}>
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/content/pages/${page.id}/edit`)}>
                            <Edit className="w-4 h-4 mr-2" />
                            편집
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => window.open(`/${page.slug}`, '_blank')}>
                            <Eye className="w-4 h-4 mr-2" />
                            보기
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => duplicateMutation.mutate(page.id)}>
                            <Copy className="w-4 h-4 mr-2" />
                            복제
                          </DropdownMenuItem>
                          {!page.isHomepage && (
                            <DropdownMenuItem onClick={() => setAsHomeMutation.mutate(page.id)}>
                              <Home className="w-4 h-4 mr-2" />
                              홈페이지로 설정
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => {
                              if (confirm('정말 이 페이지를 삭제하시겠습니까?')) {
                                deleteMutation.mutate(page.id)
                              }
                            }}
                            disabled={page.isHomepage}
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

export default PageList