import { Menu } from './Menu';
export declare enum MenuItemType {
    PAGE = "page",
    CUSTOM = "custom",
    CATEGORY = "category",
    ARCHIVE = "archive",
    POST = "post"
}
export declare enum MenuItemTarget {
    SELF = "_self",
    BLANK = "_blank",
    PARENT = "_parent",
    TOP = "_top"
}
export declare enum MenuItemDisplayMode {
    SHOW = "show",
    HIDE = "hide"
}
export declare class MenuItem {
    id: string;
    menu_id: string;
    menu: Menu;
    title: string;
    url: string;
    type: MenuItemType;
    target: MenuItemTarget;
    icon: string;
    css_class: string;
    order_num: number;
    reference_id: string;
    metadata: Record<string, any>;
    display_mode: MenuItemDisplayMode;
    target_audience: {
        roles: string[];
        user_ids?: string[];
    };
    children: MenuItem[];
    parent: MenuItem;
    created_at: Date;
    updated_at: Date;
}
//# sourceMappingURL=MenuItem.d.ts.map