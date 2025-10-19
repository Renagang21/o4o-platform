import { User } from './User';
export declare enum StoreStatus {
    ACTIVE = "active",
    INACTIVE = "inactive",
    SUSPENDED = "suspended"
}
export declare class Store {
    id: string;
    name: string;
    description?: string;
    address?: {
        street: string;
        city: string;
        state: string;
        zipcode: string;
        country: string;
    };
    phone?: string;
    businessHours?: string;
    status: StoreStatus;
    displaySettings?: {
        resolution: string;
        orientation: 'landscape' | 'portrait';
        defaultTemplate: string;
    };
    managerId: string;
    manager: User;
    createdAt: Date;
    updatedAt: Date;
    isActive(): boolean;
    canBeAccessedBy(user: User): boolean;
}
//# sourceMappingURL=Store.d.ts.map