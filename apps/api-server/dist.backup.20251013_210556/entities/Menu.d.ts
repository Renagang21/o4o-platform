import { MenuItem } from './MenuItem';
export declare class Menu {
    id: string;
    name: string;
    slug: string;
    location: string;
    description: string;
    is_active: boolean;
    metadata: Record<string, any>;
    items: MenuItem[];
    created_at: Date;
    updated_at: Date;
    generateSlug(): void;
}
//# sourceMappingURL=Menu.d.ts.map