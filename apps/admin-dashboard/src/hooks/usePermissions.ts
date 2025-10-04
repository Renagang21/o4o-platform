import { useAuthStore } from '@/stores/authStore'

export interface Permission {
  resource: string
  action: string
}

export const PERMISSIONS = {
  // 사용자 관리
  USERS_VIEW: 'users.view',
  USERS_CREATE: 'users.create',
  USERS_EDIT: 'users.edit',
  USERS_DELETE: 'users.delete',
  USERS_APPROVE: 'users.approve',
  
  // 콘텐츠 관리
  CONTENT_VIEW: 'content.view',
  CONTENT_CREATE: 'content.create',
  CONTENT_EDIT: 'content.edit',
  CONTENT_DELETE: 'content.delete',
  CONTENT_PUBLISH: 'content.publish',
  
  // 상품 관리
  PRODUCTS_VIEW: 'products.view',
  PRODUCTS_CREATE: 'products.create',
  PRODUCTS_EDIT: 'products.edit',
  PRODUCTS_DELETE: 'products.delete',
  PRODUCTS_MANAGE_INVENTORY: 'products.manage_inventory',
  
  // 주문 관리
  ORDERS_VIEW: 'orders.view',
  ORDERS_EDIT: 'orders.edit',
  ORDERS_PROCESS: 'orders.process',
  ORDERS_REFUND: 'orders.refund',
  
  // 분석 & 리포트
  ANALYTICS_VIEW: 'analytics.view',
  ANALYTICS_EXPORT: 'analytics.export',
  
  // 미디어
  MEDIA_VIEW: 'media.view',
  MEDIA_UPLOAD: 'media.upload',
  MEDIA_DELETE: 'media.delete',
  
  // 설정
  SETTINGS_VIEW: 'settings.view',
  SETTINGS_EDIT: 'settings.edit',
  SETTINGS_SYSTEM: 'settings.system',
  
  // 관리자 전용
  ADMIN_ACCESS: 'admin.access',
  ADMIN_USERS: 'admin.users',
  ADMIN_SYSTEM: 'admin.system'
} as const

export type PermissionKey = typeof PERMISSIONS[keyof typeof PERMISSIONS]

export const usePermissions = () => {
  const user = useAuthStore(state => state.user)
  
  const isAdmin = () => {
    return user?.role === 'admin' || user?.role === 'super_admin' || user?.roles?.includes('admin') || user?.roles?.includes('super_admin') || false
  }
  
  const hasPermission = (_permission: string): boolean => {
    if (!user) return false
    
    // Super admin has all permissions
    if (isAdmin()) return true
    
    // Check specific permission in user permissions
    return false // For now, as permissions are not stored in the current user object
  }
  
  const checkPermission = (permission: PermissionKey): boolean => {
    return hasPermission(permission)
  }
  
  const checkMultiplePermissions = (permissions: PermissionKey[], requireAll = false): boolean => {
    if (requireAll) {
      return permissions.every((permission: any) => hasPermission(permission))
    }
    return permissions.some((permission: any) => hasPermission(permission))
  }
  
  const getRoleBasedPermissions = () => {
    if (!user) return []
    
    const rolePermissions: Record<string, PermissionKey[]> = {
      'super_admin': Object.values(PERMISSIONS),
      'admin': Object.values(PERMISSIONS),
      'manager': [
        PERMISSIONS.USERS_VIEW,
        PERMISSIONS.USERS_EDIT,
        PERMISSIONS.CONTENT_VIEW,
        PERMISSIONS.CONTENT_CREATE,
        PERMISSIONS.CONTENT_EDIT,
        PERMISSIONS.CONTENT_PUBLISH,
        PERMISSIONS.PRODUCTS_VIEW,
        PERMISSIONS.PRODUCTS_CREATE,
        PERMISSIONS.PRODUCTS_EDIT,
        PERMISSIONS.ORDERS_VIEW,
        PERMISSIONS.ORDERS_EDIT,
        PERMISSIONS.ORDERS_PROCESS,
        PERMISSIONS.ANALYTICS_VIEW,
        PERMISSIONS.MEDIA_VIEW,
        PERMISSIONS.MEDIA_UPLOAD,
        PERMISSIONS.SETTINGS_VIEW
      ],
      'editor': [
        PERMISSIONS.CONTENT_VIEW,
        PERMISSIONS.CONTENT_CREATE,
        PERMISSIONS.CONTENT_EDIT,
        PERMISSIONS.CONTENT_PUBLISH,
        PERMISSIONS.MEDIA_VIEW,
        PERMISSIONS.MEDIA_UPLOAD
      ],
      'subscriber': [
        PERMISSIONS.CONTENT_VIEW
      ],
      'operator': [
        PERMISSIONS.ORDERS_VIEW,
        PERMISSIONS.ORDERS_EDIT,
        PERMISSIONS.ORDERS_PROCESS,
        PERMISSIONS.PRODUCTS_VIEW,
        PERMISSIONS.PRODUCTS_EDIT,
        PERMISSIONS.PRODUCTS_MANAGE_INVENTORY
      ]
    }
    
    return rolePermissions[user.role] || []
  }
  
  const canAccessMenu = (menuId: string): boolean => {
    const menuPermissions: Record<string, PermissionKey[]> = {
      'dashboard': [PERMISSIONS.ADMIN_ACCESS],
      'users': [PERMISSIONS.USERS_VIEW, PERMISSIONS.ADMIN_USERS],
      'content': [PERMISSIONS.CONTENT_VIEW],
      'products': [PERMISSIONS.PRODUCTS_VIEW],
      'orders': [PERMISSIONS.ORDERS_VIEW],
      'analytics': [PERMISSIONS.ANALYTICS_VIEW],
      'media': [PERMISSIONS.MEDIA_VIEW],
      'settings': [PERMISSIONS.SETTINGS_VIEW]
    }
    
    const requiredPermissions = menuPermissions[menuId]
    if (!requiredPermissions) return true
    
    return checkMultiplePermissions(requiredPermissions, false)
  }
  
  return {
    checkPermission,
    checkMultiplePermissions,
    getRoleBasedPermissions,
    canAccessMenu,
    isAdmin: isAdmin(),
    userRole: user?.role,
    userPermissions: []
  }
}

export default usePermissions