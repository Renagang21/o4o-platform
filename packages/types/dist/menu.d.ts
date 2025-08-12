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
    pageId?: string;
    postId?: string;
    categoryId?: string;
    children?: MenuItem[];
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
//# sourceMappingURL=menu.d.ts.map