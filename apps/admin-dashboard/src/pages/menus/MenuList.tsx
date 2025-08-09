import { FC } from 'react';
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Edit2, Trash2, Menu as MenuIcon, MoreVertical, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authClient } from '@o4o/auth-client'
import type { Menu, MenuLocation } from '@o4o/types'
import toast from 'react-hot-toast'

const locationLabels: Record<MenuLocation, string> = {
  primary: '주 메뉴',
  footer: '푸터',
  sidebar: '사이드바',
  mobile: '모바일',
}

const locationColors: Record<MenuLocation, string> = {
  primary: 'bg-blue-100 text-blue-800',
  footer: 'bg-gray-100 text-gray-800',
  sidebar: 'bg-green-100 text-green-800',
  mobile: 'bg-purple-100 text-purple-800',
}

const MenuList: FC = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Fetch menus
  const { data: menuData, isLoading } = useQuery({
    queryKey: ['menus'],
    queryFn: async () => {
      // TODO: Implement menus API endpoint in backend
      // const response = await authClient.api.get('/menus')
      // return response.data
      
      // Mock data for now
      return {
        menus: [
          { id: '1', name: 'Main Menu', location: 'primary', items: [], isActive: true },
          { id: '2', name: 'Footer Menu', location: 'footer', items: [], isActive: true }
        ]
      }
    }
  })

  const menus = menuData?.menus || []

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return authClient.api.delete(`/v1/menus/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menus'] })
      toast.success('메뉴가 삭제되었습니다')
    },
    onError: () => {
      toast.error('메뉴 삭제에 실패했습니다')
    }
  })

  // Toggle active mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return authClient.api.patch(`/v1/menus/${id}/active`, { isActive })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menus'] })
      toast.success('메뉴 상태가 변경되었습니다')
    },
    onError: () => {
      toast.error('메뉴 상태 변경에 실패했습니다')
    }
  })

  const handleDelete = (id: string) => {
    if (confirm('정말 이 메뉴를 삭제하시겠습니까?')) {
      deleteMutation.mutate(id)
    }
  }

  const handleToggleActive = (menu: Menu) => {
    toggleActiveMutation.mutate({ id: menu.id, isActive: !menu.isActive })
  }

  // Group menus by location
  const menusByLocation = menus.reduce((acc: Record<MenuLocation, Menu[]>, menu: Menu) => {
    if (!acc[menu.location]) {
      acc[menu.location] = []
    }
    acc[menu.location].push(menu)
    return acc
  }, {} as Record<MenuLocation, Menu[]>)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">메뉴 관리</h1>
          <p className="text-gray-600 mt-1">사이트의 내비게이션 메뉴를 관리합니다</p>
        </div>
        <Button onClick={() => navigate('/themes/menus/new')}>
          <Plus className="w-4 h-4 mr-2" />
          새 메뉴
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
        </div>
      ) : menus.length > 0 ? (
        <div className="space-y-8">
          {(['primary', 'footer', 'sidebar', 'mobile'] as MenuLocation[]).map((location) => {
            const locationMenus = menusByLocation[location] || []
            if (locationMenus.length === 0) return null

            return (
              <div key={location}>
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Badge className={locationColors[location]}>
                    {locationLabels[location]}
                  </Badge>
                  <span className="text-sm text-gray-500 font-normal">
                    ({locationMenus.length}개 메뉴)
                  </span>
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {locationMenus.map((menu: Menu) => (
                    <Card key={menu.id}>
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1 flex-1">
                            <CardTitle className="text-lg flex items-center gap-2">
                              <MenuIcon className="w-4 h-4" />
                              {menu.name}
                            </CardTitle>
                            {menu.description && (
                              <p className="text-sm text-gray-500">{menu.description}</p>
                            )}
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger>
                              <Button variant={"ghost" as const} size={"sm" as const}>
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(`/themes/menus/${menu.id}/edit`)}>
                                <Edit2 className="w-4 h-4 mr-2" />
                                편집
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDelete(menu.id)}
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
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">항목 수</span>
                            <Badge variant={"outline" as const}>{menu.items.length}개</Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">활성화</span>
                            <div className="flex items-center gap-2">
                              {menu.isActive ? (
                                <Check className="w-4 h-4 text-green-600" />
                              ) : (
                                <X className="w-4 h-4 text-gray-400" />
                              )}
                              <Switch
                                checked={menu.isActive}
                                onCheckedChange={() => handleToggleActive(menu)}
                                disabled={toggleActiveMutation.isPending}
                              />
                            </div>
                          </div>
                          <div className="pt-3 border-t">
                            <Link
                              to={`/themes/menus/${menu.id}/edit`}
                              className="text-sm text-blue-600 hover:text-blue-800"
                            >
                              메뉴 편집 →
                            </Link>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <MenuIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">메뉴가 없습니다</p>
            <Button onClick={() => navigate('/themes/menus/new')}>
              <Plus className="w-4 h-4 mr-2" />
              첫 메뉴 만들기
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default MenuList