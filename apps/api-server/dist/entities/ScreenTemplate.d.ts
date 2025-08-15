export declare enum TemplateStatus {
    ACTIVE = "active",
    INACTIVE = "inactive"
}
export declare class ScreenTemplate {
    id: string;
    name: string;
    description?: string;
    layout: {
        zones: Array<{
            id: string;
            name: string;
            type: 'video' | 'image';
            position: {
                x: number;
                y: number;
                width: number;
                height: number;
            };
            zIndex: number;
            isMain: boolean;
        }>;
        resolution: {
            width: number;
            height: number;
        };
    };
    status: TemplateStatus;
    isDefault: boolean;
    previewImage?: string;
    createdAt: Date;
    updatedAt: Date;
    isActive(): boolean;
    getMainZone(): {
        id: string;
        name: string;
        type: "video" | "image";
        position: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
        zIndex: number;
        isMain: boolean;
    };
    getSubZones(): {
        id: string;
        name: string;
        type: "video" | "image";
        position: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
        zIndex: number;
        isMain: boolean;
    }[];
    getZoneById(zoneId: string): {
        id: string;
        name: string;
        type: "video" | "image";
        position: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
        zIndex: number;
        isMain: boolean;
    };
}
//# sourceMappingURL=ScreenTemplate.d.ts.map