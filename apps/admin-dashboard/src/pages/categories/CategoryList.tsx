import { useState, FC } from 'react';
import { Plus, Edit2, Trash2, FolderOpen, MoreVertical, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authClient } from '@o4o/auth-client'
import type { Category } from '@o4o/types'

// Admin-specific category interface that extends base Category
interface AdminCategory extends Category {
  postCount?: number
}
import toast from 'react-hot-toast'

interface CategoryFormData {
  name: string
  slug: string
  description?: string
  parentId?: string
}

const CategoryList: React.FC = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<AdminCategory | null>(null)
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    slug: '',
    description: '',
    parentId: ''
  })

  const queryClient = useQueryClient()

  // Fetch categories
  const { data: categories = [], isLoading } = useQuery<AdminCategory[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await authClient.api.get('/categories')
      return response.data as AdminCategory[]
    }
  })

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: CategoryFormData) => {
      if (editingCategory) {
        return authClient.api.put(`/categories/${editingCategory.id}`, data)
      }
      return authClient.api.post('/categories', data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      toast.success(editingCategory ? '카테고리가 수정되었습니다' : '카테고리가 생성되었습니다')
      handleCloseDialog()
    },
    onError: () => {
      toast.error('카테고리 저장에 실패했습니다')
    }
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return authClient.api.delete(`/categories/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      toast.success('카테고리가 삭제되었습니다')
    },
    onError: () => {
      toast.error('카테고리 삭제에 실패했습니다')
    }
  })

  const handleOpenDialog = (category?: AdminCategory) => {
    if (category) {
      setEditingCategory(category)
      setFormData({
        name: category.name,
        slug: category.slug,
        description: category.description || '',
        parentId: category.parentId || ''
      })
    } else {
      setEditingCategory(null)
      setFormData({
        name: '',
        slug: '',
        description: '',
        parentId: ''
      })
    }
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingCategory(null)
    setFormData({
      name: '',
      slug: '',
      description: '',
      parentId: ''
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    saveMutation.mutate(formData)
  }

  const handleDelete = (id: string) => {
    if (confirm('정말 이 카테고리를 삭제하시겠습니까?\n하위 카테고리가 있다면 함께 삭제됩니다.')) {
      deleteMutation.mutate(id)
    }
  }

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9가-힣]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  // Build hierarchical category tree
  const buildCategoryTree = (categories: AdminCategory[]) => {
    const categoryMap = new Map<string, AdminCategory & { children?: AdminCategory[] }>()
    const rootCategories: (AdminCategory & { children?: AdminCategory[] })[] = []

    // First pass: create map
    categories.forEach(cat => {
      categoryMap.set(cat.id, { ...cat, children: [] })
    })

    // Second pass: build tree
    categories.forEach(cat => {
      const category = categoryMap.get(cat.id)!
      if (cat.parentId) {
        const parent = categoryMap.get(cat.parentId)
        if (parent) {
          parent.children = parent.children || []
          parent.children.push(category)
        }
      } else {
        rootCategories.push(category)
      }
    })

    return rootCategories
  }

  const renderCategoryCard = (category: AdminCategory & { children?: AdminCategory[] }, level = 0) => {
    return (
      <div key={category.id} className={level > 0 ? 'ml-8' : ''}>
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  {category.children && category.children.length > 0 && (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  )}
                  <CardTitle className="text-lg">{category.name}</CardTitle>
                </div>
                <p className="text-sm text-gray-500">/{category.slug}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {category.postCount || 0}개 게시글
                </Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleOpenDialog(category)}>
                      <Edit2 className="w-4 h-4 mr-2" />
                      수정
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleDelete(category.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      삭제
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>
          {category.description && (
            <CardContent>
              <p className="text-sm text-gray-600">{category.description}</p>
            </CardContent>
          )}
        </Card>
        {category.children && category.children.map(child => renderCategoryCard(child, level + 1))}
      </div>
    )
  }

  const categoryTree = buildCategoryTree(categories)

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <p className="text-gray-600">계층 구조로 콘텐츠를 체계적으로 분류합니다</p>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="w-4 h-4 mr-2" />
          새 카테고리
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      ) : categories.length > 0 ? (
        <div>
          {categoryTree.map(category => renderCategoryCard(category))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <FolderOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">카테고리가 없습니다</p>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              첫 카테고리 만들기
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? '카테고리 수정' : '새 카테고리'}
              </DialogTitle>
              <DialogDescription>
                게시물을 분류할 카테고리를 만들어보세요
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
                  placeholder="예: 공지사항"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">슬러그</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e: any) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="notice"
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
                  placeholder="이 카테고리에 대한 설명을 입력하세요"
                  rows={3}
                />
              </div>
              {categories.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="parent">상위 카테고리 (선택)</Label>
                  <Select
                    value={formData.parentId}
                    onValueChange={(value) => setFormData({ ...formData, parentId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="상위 카테고리 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">없음</SelectItem>
                      {categories
                        .filter((cat: AdminCategory) => cat.id !== editingCategory?.id)
                        .map((cat: AdminCategory) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
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

export default CategoryList