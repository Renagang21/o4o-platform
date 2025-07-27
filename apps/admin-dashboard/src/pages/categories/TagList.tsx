import { useState } from 'react';
import { Plus, Edit2, Trash2, Tag as TagIcon, MoreVertical, Hash } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authClient } from '@o4o/auth-client'
import type { Tag } from '@o4o/types'
import toast from 'react-hot-toast'

interface TagFormData {
  name: string
  slug: string
  description?: string
}


const TagList: React.FC = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTag, setEditingTag] = useState<Tag | null>(null)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [formData, setFormData] = useState<TagFormData>({
    name: '',
    slug: '',
    description: ''
  })

  const queryClient = useQueryClient()

  // Fetch tags
  const { data: tags = [], isLoading } = useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      const response = await authClient.api.get('/tags')
      return response.data
    }
  })

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: TagFormData) => {
      if (editingTag) {
        return authClient.api.put(`/tags/${editingTag.id}`, data)
      }
      return authClient.api.post('/tags', data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] })
      toast.success(editingTag ? '태그가 수정되었습니다' : '태그가 생성되었습니다')
      handleCloseDialog()
    },
    onError: () => {
      toast.error('태그 저장에 실패했습니다')
    }
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return authClient.api.delete(`/tags/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] })
      toast.success('태그가 삭제되었습니다')
    },
    onError: () => {
      toast.error('태그 삭제에 실패했습니다')
    }
  })

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      return authClient.api.post('/tags/bulk-delete', { ids })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] })
      toast.success(`${selectedTags.length}개의 태그가 삭제되었습니다`)
      setSelectedTags([])
    },
    onError: () => {
      toast.error('태그 일괄 삭제에 실패했습니다')
    }
  })

  const handleOpenDialog = (tag?: Tag) => {
    if (tag) {
      setEditingTag(tag)
      setFormData({
        name: tag.name,
        slug: tag.slug,
        description: tag.description || ''
      })
    } else {
      setEditingTag(null)
      setFormData({
        name: '',
        slug: '',
        description: ''
      })
    }
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingTag(null)
    setFormData({
      name: '',
      slug: '',
      description: ''
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    saveMutation.mutate(formData)
  }

  const handleDelete = (id: string) => {
    if (confirm('정말 이 태그를 삭제하시겠습니까?')) {
      deleteMutation.mutate(id)
    }
  }

  const handleBulkDelete = () => {
    if (confirm(`정말 ${selectedTags.length}개의 태그를 삭제하시겠습니까?`)) {
      bulkDeleteMutation.mutate(selectedTags)
    }
  }

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9가-힣]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  const toggleTagSelection = (tagId: string) => {
    setSelectedTags(prev => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    )
  }

  // Sort tags by post count
  const sortedTags = [...tags].sort((a: any, b: any) => (b.postCount || 0) - (a.postCount || 0))

  // Get tag size based on post count
  const getTagSize = (postCount: number) => {
    if (postCount >= 50) return 'text-lg font-semibold'
    if (postCount >= 20) return 'text-base font-medium'
    if (postCount >= 10) return 'text-sm'
    return 'text-xs'
  }

  // Get tag color based on usage
  const getTagColor = (postCount: number) => {
    if (postCount >= 50) return 'bg-blue-100 text-blue-800 hover:bg-blue-200'
    if (postCount >= 20) return 'bg-green-100 text-green-800 hover:bg-green-200'
    if (postCount >= 10) return 'bg-gray-100 text-gray-800 hover:bg-gray-200'
    return 'bg-gray-50 text-gray-600 hover:bg-gray-100'
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <p className="text-gray-600">키워드로 콘텐츠를 유연하게 분류합니다</p>
        <div className="flex gap-2">
          {selectedTags.length > 0 && (
            <Button 
              variant="destructive" 
              onClick={handleBulkDelete}
              disabled={bulkDeleteMutation.isPending}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {selectedTags.length}개 삭제
            </Button>
          )}
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="w-4 h-4 mr-2" />
            새 태그
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      ) : tags.length > 0 ? (
        <>
          {/* Tag Cloud */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">태그 클라우드</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {sortedTags.slice(0, 30).map((tag: Tag) => (
                  <Badge 
                    key={tag.id} 
                    variant="secondary"
                    className={`cursor-pointer transition-colors ${getTagSize(tag.postCount || 0)} ${getTagColor(tag.postCount || 0)}`}
                    onClick={() => handleOpenDialog(tag)}
                  >
                    <Hash className="w-3 h-3 mr-1" />
                    {tag.name}
                    <span className="ml-1 opacity-60">({tag.postCount || 0})</span>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Tag List */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sortedTags.map((tag: Tag) => (
              <Card 
                key={tag.id}
                className={selectedTags.includes(tag.id) ? 'ring-2 ring-blue-500' : ''}
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3 flex-1">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300"
                        checked={selectedTags.includes(tag.id)}
                        onChange={() => toggleTagSelection(tag.id)}
                      />
                      <div className="space-y-1 flex-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <TagIcon className="w-4 h-4" />
                          {tag.name}
                        </CardTitle>
                        <p className="text-sm text-gray-500">/{tag.slug}</p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenDialog(tag)}>
                          <Edit2 className="w-4 h-4 mr-2" />
                          수정
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDelete(tag.id)}
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
                  {tag.description && (
                    <p className="text-sm text-gray-600 mb-3">{tag.description}</p>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <Badge variant="outline">
                      {tag.postCount || 0}개 게시글
                    </Badge>
                    <span className="text-gray-500">
                      {new Date(tag.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <TagIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">태그가 없습니다</p>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              첫 태그 만들기
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingTag ? '태그 수정' : '새 태그'}
              </DialogTitle>
              <DialogDescription>
                게시물에 사용할 태그를 만들어보세요
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">이름</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e: any) => {
                    setFormData({
                      ...formData,
                      name: e.target.value,
                      slug: generateSlug(e.target.value)
                    })
                  }}
                  placeholder="예: React"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">슬러그</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e: any) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="react"
                  required
                />
                <p className="text-xs text-gray-500">URL에 사용되는 고유 식별자입니다</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">설명 (선택)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e: any) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="이 태그에 대한 설명을 입력하세요"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                취소
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? '저장 중...' : '저장'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default TagList