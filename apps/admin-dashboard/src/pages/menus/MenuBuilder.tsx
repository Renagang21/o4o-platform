import { useState, useEffect, FC } from 'react';
import { useNavigate, useParams } from 'react-router-dom'
import { 
  ArrowLeft, 
  Save, 
  Plus, 
  Trash2, 
  GripVertical, 
  Link as LinkIcon,
  FileText,
  FolderOpen,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Edit2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authClient } from '@o4o/auth-client'
import type { 
  MenuItem, 
  MenuItemType, 
  MenuLocation, 
  CreateMenuDto, 
  UpdateMenuDto,
  Post,
  Category 
} from '@o4o/types'
import toast from 'react-hot-toast'

interface MenuItemFormData {
  label: string
  type: MenuItemType
  url?: string
  target?: '_self' | '_blank'
  icon?: string
  cssClass?: string
  pageId?: string
  postId?: string
  categoryId?: string
}

interface DraggableMenuItem extends MenuItem {
  isExpanded?: boolean
}

const MenuBuilder: FC = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const queryClient = useQueryClient()
  const isEditMode = !!id

  // Form state
  const [menuName, setMenuName] = useState('')
  const [menuLocation, setMenuLocation] = useState<MenuLocation>('primary')
  const [menuDescription, setMenuDescription] = useState('')
  const [menuItems, setMenuItems] = useState<DraggableMenuItem[]>([])
  
  // UI state
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<DraggableMenuItem | null>(null)
  const [draggedItem, setDraggedItem] = useState<DraggableMenuItem | null>(null)
  const [dragOverItem, setDragOverItem] = useState<string | null>(null)
  
  // Item form state
  const [itemFormData, setItemFormData] = useState<MenuItemFormData>({
    label: '',
    type: 'custom',
    url: '',
    target: '_self'
  })

  // Fetch menu data (edit mode)
  const { data: menu, isLoading: isLoadingMenu } = useQuery({
    queryKey: ['menu', id],
    queryFn: async () => {
      const response = await authClient.api.get(`/v1/menus/${id}`)
      return response.data
    },
    enabled: isEditMode
  })

  // Fetch pages for selection
  const { data: pages = [] } = useQuery({
    queryKey: ['pages-for-menu'],
    queryFn: async () => {
      const response = await authClient.api.get('/v1/posts?type=page&status=published')
      return response.data.posts || []
    }
  })

  // Fetch posts for selection
  const { data: posts = [] } = useQuery({
    queryKey: ['posts-for-menu'],
    queryFn: async () => {
      const response = await authClient.api.get('/v1/posts?type=post&status=published&limit=50')
      return response.data.posts || []
    }
  })

  // Fetch categories for selection
  const { data: categories = [] } = useQuery({
    queryKey: ['categories-for-menu'],
    queryFn: async () => {
      const response = await authClient.api.get('/v1/categories')
      return response.data
    }
  })

  // Create menu mutation
  const createMutation = useMutation({
    mutationFn: async (data: CreateMenuDto) => {
      const response = await authClient.api.post('/v1/menus', data)
      return response.data
    },
    onSuccess: () => {
      toast.success('메뉴가 생성되었습니다')
      queryClient.invalidateQueries({ queryKey: ['menus'] })
      navigate('/themes/menus')
    },
    onError: () => {
      toast.error('메뉴 생성에 실패했습니다')
    }
  })

  // Update menu mutation
  const updateMutation = useMutation({
    mutationFn: async (data: UpdateMenuDto) => {
      const response = await authClient.api.put(`/v1/menus/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      toast.success('메뉴가 수정되었습니다')
      queryClient.invalidateQueries({ queryKey: ['menus'] })
      queryClient.invalidateQueries({ queryKey: ['menu', id] })
    },
    onError: () => {
      toast.error('메뉴 수정에 실패했습니다')
    }
  })

  // Load menu data in edit mode
  useEffect(() => {
    if (menu) {
      setMenuName(menu.name)
      setMenuLocation(menu.location)
      setMenuDescription(menu.description || '')
      setMenuItems(menu.items.map((item: MenuItem) => ({ ...item, isExpanded: false })))
    }
  }, [menu])

  // Handle save
  const handleSave = () => {
    // Function to clean items (remove isExpanded property)
    const cleanItems = (items: DraggableMenuItem[]): MenuItem[] => {
      return items.map(({ isExpanded, ...item }) => ({
        ...item,
        children: item.children ? cleanItems(item.children) : undefined
      })) as MenuItem[]
    }
    
    const menuData = {
      name: menuName,
      location: menuLocation,
      description: menuDescription,
      items: cleanItems(menuItems),
      isActive: true
    }

    if (isEditMode) {
      updateMutation.mutate({ id, ...menuData })
    } else {
      createMutation.mutate(menuData)
    }
  }

  // Add/Edit menu item
  const handleAddItem = () => {
    setEditingItem(null)
    setItemFormData({
      label: '',
      type: 'custom',
      url: '',
      target: '_self'
    })
    setIsItemDialogOpen(true)
  }

  const handleEditItem = (item: DraggableMenuItem) => {
    setEditingItem(item)
    setItemFormData({
      label: item.label,
      type: item.type,
      url: item.url,
      target: item.target,
      icon: item.icon,
      cssClass: item.cssClass,
      pageId: item.pageId,
      postId: item.postId,
      categoryId: item.categoryId
    })
    setIsItemDialogOpen(true)
  }

  const handleSaveItem = () => {
    const newItem: DraggableMenuItem = {
      id: editingItem?.id || `item-${Date.now()}`,
      ...itemFormData,
      order: editingItem?.order || menuItems.length,
      parentId: editingItem?.parentId,
      children: editingItem?.children || [],
      createdAt: editingItem?.createdAt || new Date(),
      updatedAt: new Date()
    }

    if (editingItem) {
      // Function to update item in tree
      const updateInTree = (items: DraggableMenuItem[]): DraggableMenuItem[] => {
        return items.map((item) => {
          if (item.id === editingItem.id) {
            return { ...newItem, isExpanded: item.isExpanded }
          }
          if (item.children && item.children.length > 0) {
            return {
              ...item,
              children: updateInTree(item.children)
            }
          }
          return item
        })
      }
      
      setMenuItems(updateInTree(menuItems))
    } else {
      setMenuItems([...menuItems, newItem])
    }

    setIsItemDialogOpen(false)
  }

  const handleDeleteItem = (itemId: string) => {
    // Function to remove item from tree
    const removeFromTree = (items: DraggableMenuItem[]): DraggableMenuItem[] => {
      return items.filter(item => {
        if (item.id === itemId) {
          return false
        }
        if (item.children && item.children.length > 0) {
          item.children = removeFromTree(item.children)
        }
        return true
      })
    }
    
    setMenuItems(removeFromTree(menuItems))
  }

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, item: DraggableMenuItem) => {
    setDraggedItem(item)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, itemId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverItem(itemId)
  }

  const handleDragLeave = () => {
    setDragOverItem(null)
  }

  const handleDrop = (e: React.DragEvent, targetItem: DraggableMenuItem, dropPosition: 'before' | 'after' | 'inside' = 'after') => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!draggedItem || draggedItem.id === targetItem.id) return

    // Create a deep copy of menu items
    const newItems = JSON.parse(JSON.stringify(menuItems))
    
    // Function to find and remove item from tree
    const removeFromTree = (items: DraggableMenuItem[], itemId: string): DraggableMenuItem | null => {
      for (let i = 0; i < items.length; i++) {
        if (items[i].id === itemId) {
          return items.splice(i, 1)[0]
        }
        if (items[i].children && items[i].children!.length > 0) {
          const found = removeFromTree(items[i].children!, itemId)
          if (found) return found
        }
      }
      return null
    }
    
    // Function to insert item into tree
    const insertIntoTree = (items: DraggableMenuItem[], targetId: string, item: DraggableMenuItem, position: 'before' | 'after' | 'inside'): boolean => {
      for (let i = 0; i < items.length; i++) {
        if (items[i].id === targetId) {
          if (position === 'inside') {
            // Add as child
            items[i].children = items[i].children || []
            item.parentId = targetId
            items[i].children!.push(item)
            items[i].isExpanded = true
          } else {
            // Add as sibling
            item.parentId = items[i].parentId
            const insertIndex = position === 'before' ? i : i + 1
            items.splice(insertIndex, 0, item)
          }
          return true
        }
        if (items[i].children && items[i].children!.length > 0) {
          if (insertIntoTree(items[i].children!, targetId, item, position)) {
            return true
          }
        }
      }
      return false
    }
    
    // Remove dragged item from tree
    const removedItem = removeFromTree(newItems, draggedItem.id)
    if (!removedItem) return
    
    // Insert item at new position
    insertIntoTree(newItems, targetItem.id, removedItem, dropPosition)
    
    // Update order values
    const updateOrder = (items: DraggableMenuItem[], startOrder = 0) => {
      items.forEach((item, index) => {
        item.order = startOrder + index
        if (item.children && item.children.length > 0) {
          updateOrder(item.children, 0)
        }
      })
    }
    updateOrder(newItems)

    setMenuItems(newItems)
    setDraggedItem(null)
    setDragOverItem(null)
  }

  const toggleItemExpanded = (itemId: string) => {
    setMenuItems(menuItems.map((item: any) => 
      item.id === itemId ? { ...item, isExpanded: !item.isExpanded } : item
    ))
  }

  // Get icon for menu item type
  const getItemIcon = (type: MenuItemType) => {
    switch (type) {
      case 'page':
        return <FileText className="w-4 h-4" />
      case 'post':
        return <FileText className="w-4 h-4" />
      case 'category':
        return <FolderOpen className="w-4 h-4" />
      case 'custom':
        return <LinkIcon className="w-4 h-4" />
      default:
        return <LinkIcon className="w-4 h-4" />
    }
  }

  const renderMenuItem = (item: DraggableMenuItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0

    return (
      <div key={item.id} className={level > 0 ? 'ml-8' : ''}>
        <div
          className={`
            relative flex items-center gap-2 p-3 bg-white border rounded-lg mb-2 transition-all
            ${dragOverItem === item.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
            ${draggedItem?.id === item.id ? 'opacity-50' : ''}
            hover:shadow-sm
          `}
          draggable
          onDragStart={(e) => handleDragStart(e, item)}
          onDragOver={(e) => {
            e.preventDefault()
            handleDragOver(e, item.id)
          }}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, item, 'after')}
        >
          <GripVertical className="w-5 h-5 text-gray-400 cursor-move flex-shrink-0" />
          
          {hasChildren && (
            <button
              onClick={() => toggleItemExpanded(item.id)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              {item.isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          )}

          <div className="flex-1 flex items-center gap-2 min-w-0">
            {getItemIcon(item.type)}
            <span className="font-medium truncate">{item.label}</span>
            <Badge variant={"outline" as const} className="text-xs flex-shrink-0">
              {item.type}
            </Badge>
            {item.url && (
              <span className="text-sm text-gray-500 truncate hidden sm:block">({item.url})</span>
            )}
            {item.target === '_blank' && (
              <ExternalLink className="w-3 h-3 text-gray-400 flex-shrink-0" />
            )}
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              variant={"ghost" as const}
              size={"sm" as const}
              onClick={() => handleEditItem(item)}
              className="h-8 w-8 p-0"
            >
              <Edit2 className="w-4 h-4" />
            </Button>
            <Button
              variant={"ghost" as const}
              size={"sm" as const}
              onClick={() => handleDeleteItem(item.id)}
              className="h-8 w-8 p-0 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          </div>
          
          {/* Drop zone indicator for nesting */}
          <div
            className="absolute inset-x-0 bottom-0 h-8 flex items-end justify-center opacity-0 hover:opacity-100"
            onDragOver={(e) => {
              e.preventDefault()
              e.stopPropagation()
            }}
            onDrop={(e) => {
              e.preventDefault()
              e.stopPropagation()
              handleDrop(e, item, 'inside')
            }}
          >
            <div className="w-full mx-8 h-1 bg-purple-500 rounded-full flex items-center justify-center">
              <span className="text-xs bg-purple-500 text-white px-2 py-1 rounded">Drop here to nest</span>
            </div>
          </div>
        </div>

        {hasChildren && item.isExpanded && (
          <div className="ml-4 pl-4 border-l-2 border-gray-200">
            {item.children!.map(child => renderMenuItem(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  if (isEditMode && isLoadingMenu) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant={"ghost" as const}
          size={"sm" as const}
          onClick={() => navigate('/themes/menus')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          메뉴 목록
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditMode ? '메뉴 수정' : '새 메뉴 만들기'}
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Menu Settings */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>메뉴 설정</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">메뉴 이름</Label>
                <Input
                  id="name"
                  value={menuName}
                  onChange={(e: any) => setMenuName(e.target.value)}
                  placeholder="예: 주 메뉴"
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="location">메뉴 위치</Label>
                <Select
                  value={menuLocation}
                  onValueChange={(value: string) => setMenuLocation(value as MenuLocation)}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="primary">주 메뉴</SelectItem>
                    <SelectItem value="footer">푸터</SelectItem>
                    <SelectItem value="sidebar">사이드바</SelectItem>
                    <SelectItem value="mobile">모바일</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="description">설명 (선택)</Label>
                <Input
                  id="description"
                  value={menuDescription}
                  onChange={(e: any) => setMenuDescription(e.target.value)}
                  placeholder="메뉴 설명"
                  className="mt-2"
                />
              </div>

              <div className="pt-4">
                <Button 
                  onClick={handleSave}
                  className="w-full"
                  disabled={!menuName || createMutation.isPending || updateMutation.isPending}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isEditMode ? '메뉴 수정' : '메뉴 생성'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Available Items */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>항목 추가</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="pages">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="pages">페이지</TabsTrigger>
                  <TabsTrigger value="posts">포스트</TabsTrigger>
                  <TabsTrigger value="categories">카테고리</TabsTrigger>
                  <TabsTrigger value="custom">사용자 정의</TabsTrigger>
                </TabsList>

                <TabsContent value="pages" className="space-y-2">
                  {pages.map((page: Post) => (
                    <div
                      key={page.id}
                      className="p-2 border rounded hover:bg-gray-50 cursor-pointer"
                      onClick={() => {
                        const newItem: DraggableMenuItem = {
                          id: `item-${Date.now()}`,
                          label: page.title,
                          type: 'page',
                          pageId: page.id,
                          url: `/${page.slug}`,
                          order: menuItems.length,
                          createdAt: new Date(),
                          updatedAt: new Date()
                        }
                        setMenuItems([...menuItems, newItem])
                      }}
                    >
                      <div className="font-medium">{page.title}</div>
                      <div className="text-sm text-gray-500">/{page.slug}</div>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="posts" className="space-y-2">
                  {posts.map((post: Post) => (
                    <div
                      key={post.id}
                      className="p-2 border rounded hover:bg-gray-50 cursor-pointer"
                      onClick={() => {
                        const newItem: DraggableMenuItem = {
                          id: `item-${Date.now()}`,
                          label: post.title,
                          type: 'post',
                          postId: post.id,
                          url: `/post/${post.slug}`,
                          order: menuItems.length,
                          createdAt: new Date(),
                          updatedAt: new Date()
                        }
                        setMenuItems([...menuItems, newItem])
                      }}
                    >
                      <div className="font-medium">{post.title}</div>
                      <div className="text-sm text-gray-500">/post/{post.slug}</div>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="categories" className="space-y-2">
                  {categories.map((category: Category) => (
                    <div
                      key={category.id}
                      className="p-2 border rounded hover:bg-gray-50 cursor-pointer"
                      onClick={() => {
                        const newItem: DraggableMenuItem = {
                          id: `item-${Date.now()}`,
                          label: category.name,
                          type: 'category',
                          categoryId: category.id,
                          url: `/category/${category.slug}`,
                          order: menuItems.length,
                          createdAt: new Date(),
                          updatedAt: new Date()
                        }
                        setMenuItems([...menuItems, newItem])
                      }}
                    >
                      <div className="font-medium">{category.name}</div>
                      <div className="text-sm text-gray-500">/category/{category.slug}</div>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="custom" className="pt-4">
                  <Button onClick={handleAddItem} className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    사용자 정의 링크 추가
                  </Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Menu Structure */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>메뉴 구조</CardTitle>
              <p className="text-sm text-gray-500">
                드래그 앤 드롭으로 메뉴 항목의 순서를 변경할 수 있습니다
              </p>
            </CardHeader>
            <CardContent>
              {menuItems.length > 0 ? (
                <div>
                  {menuItems.map((item: any) => renderMenuItem(item))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <p>메뉴 항목이 없습니다</p>
                  <p className="text-sm mt-2">왼쪽에서 항목을 추가하세요</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Item Edit Dialog */}
      <Dialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingItem ? '메뉴 항목 수정' : '사용자 정의 링크'}
            </DialogTitle>
            <DialogDescription>
              메뉴에 표시될 링크 정보를 입력하세요
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="itemLabel">레이블</Label>
              <Input
                id="itemLabel"
                value={itemFormData.label}
                onChange={(e: any) => setItemFormData({ ...itemFormData, label: e.target.value })}
                placeholder="메뉴에 표시될 텍스트"
              />
            </div>
            <div>
              <Label htmlFor="itemUrl">URL</Label>
              <Input
                id="itemUrl"
                value={itemFormData.url}
                onChange={(e: any) => setItemFormData({ ...itemFormData, url: e.target.value })}
                placeholder="https://example.com 또는 /page-slug"
              />
            </div>
            <div>
              <Label htmlFor="itemTarget">링크 열기</Label>
              <Select
                value={itemFormData.target}
                onValueChange={(value: string) => setItemFormData({ ...itemFormData, target: value as '_self' | '_blank' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_self">같은 창</SelectItem>
                  <SelectItem value="_blank">새 창</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="itemCssClass">CSS 클래스 (선택)</Label>
              <Input
                id="itemCssClass"
                value={itemFormData.cssClass}
                onChange={(e: any) => setItemFormData({ ...itemFormData, cssClass: e.target.value })}
                placeholder="custom-class"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant={"outline" as const} onClick={() => setIsItemDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSaveItem}>
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default MenuBuilder