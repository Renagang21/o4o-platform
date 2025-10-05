// Menu types for navigation management

export type MenuItemType = 'page' | 'post' | 'category' | 'custom' | 'submenu';
export type MenuLocation = 'primary' | 'footer' | 'sidebar' | 'mobile';

export interface MenuItem {
  id: string;
  label: string;
  type: MenuItemType;
  url?: string;
  target?: '_self' | '_blank';
  icon?: string;
  cssClass?: string;
  parentId?: string;
  order: number;
  // Reference IDs for different types
  pageId?: string;
  postId?: string;
  categoryId?: string;
  // Role-based visibility
  visibleRoles?: string[]; // Role names (빈 배열 또는 undefined면 모두에게 표시)
  // Nested items
  children?: MenuItem[];
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export interface Menu {
  id: string;
  name: string;
  location: MenuLocation;
  description?: string;
  items: MenuItem[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMenuDto {
  name: string;
  location: MenuLocation;
  description?: string;
  items?: Omit<MenuItem, 'id' | 'createdAt' | 'updatedAt'>[];
  isActive?: boolean;
}

export interface UpdateMenuDto extends Partial<CreateMenuDto> {
  id: string;
}

export interface MenuListResponse {
  menus: Menu[];
  total: number;
}