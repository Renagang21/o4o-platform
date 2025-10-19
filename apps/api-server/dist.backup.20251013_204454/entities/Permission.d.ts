import { Role } from './Role';
export declare class Permission {
    id: string;
    key: string;
    description: string;
    category: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    roles?: Role[];
    static parseKey(key: string): {
        category: string;
        action: string;
    };
    getCategory(): string;
    getAction(): string;
}
//# sourceMappingURL=Permission.d.ts.map