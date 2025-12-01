/**
 * Forum Yaksa Extension App Manifest
 *
 * Extends forum-core with Yaksa organization-specific features:
 * - Drug database integration
 * - Case study sharing
 * - Pharmacy-focused categories
 * - Medication guidance
 */
export declare const forumYaksaManifest: {
    appId: string;
    name: string;
    type: "extension";
    version: string;
    description: string;
    dependencies: {
        'forum-core': string;
    };
    uninstallPolicy: {
        defaultMode: "keep-data";
        allowPurge: boolean;
        autoBackup: boolean;
    };
    ownsTables: string[];
    extendsCPT: {
        name: string;
        acfGroup: string;
    }[];
    acf: {
        groupId: string;
        label: string;
        fields: ({
            key: string;
            type: string;
            label: string;
            options?: undefined;
        } | {
            key: string;
            type: string;
            label: string;
            options: string[];
        })[];
    }[];
    adminRoutes: {
        path: string;
        component: string;
    }[];
    defaultConfig: {
        categories: {
            name: string;
            slug: string;
            color: string;
        }[];
        skin: string;
        brandColor: string;
        accentColor: string;
        requireApproval: boolean;
    };
    permissions: any[];
    menu: any;
};
export default forumYaksaManifest;
//# sourceMappingURL=manifest.d.ts.map