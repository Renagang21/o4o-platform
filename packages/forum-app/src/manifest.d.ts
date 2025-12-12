/**
 * Forum Core App Manifest
 *
 * Core forum engine providing:
 * - Posts, comments, categories, tags
 * - Likes, bookmarks, reports
 * - Public templates for rendering
 */
export declare const forumManifest: {
    appId: string;
    displayName: string;
    version: string;
    appType: "core";
    description: string;
    dependencies: {
        core: any[];
        optional: string[];
    };
    ownsTables: string[];
    uninstallPolicy: {
        defaultMode: "keep-data";
        allowPurge: boolean;
        autoBackup: boolean;
    };
    backend: {
        entities: string[];
        services: string[];
        controllers: string[];
        routesExport: string;
    };
    frontend: {
        admin: {
            pages: {
                path: string;
                component: string;
            }[];
        };
        public: {
            pages: {
                path: string;
                component: string;
                template: string;
            }[];
        };
    };
    lifecycle: {
        install: string;
        activate: string;
        deactivate: string;
        uninstall: string;
    };
    permissions: {
        id: string;
        name: string;
        description: string;
        category: string;
    }[];
    menus: {
        admin: {
            id: string;
            label: string;
            icon: string;
            order: number;
            children: {
                id: string;
                label: string;
                path: string;
                icon: string;
            }[];
        }[];
    };
    exposes: {
        services: string[];
        types: string[];
        events: string[];
    };
    cpt: {
        name: string;
        storage: "entity";
        primaryKey: string;
        label: string;
        supports: string[];
    }[];
    viewTemplates: {
        id: string;
        name: string;
        description: string;
        component: string;
        dataLoader: string;
    }[];
    defaultConfig: {
        postsPerPage: number;
        enableLikes: boolean;
        enableBookmarks: boolean;
        enableComments: boolean;
        moderationEnabled: boolean;
    };
};
export declare const manifest: {
    appId: string;
    displayName: string;
    version: string;
    appType: "core";
    description: string;
    dependencies: {
        core: any[];
        optional: string[];
    };
    ownsTables: string[];
    uninstallPolicy: {
        defaultMode: "keep-data";
        allowPurge: boolean;
        autoBackup: boolean;
    };
    backend: {
        entities: string[];
        services: string[];
        controllers: string[];
        routesExport: string;
    };
    frontend: {
        admin: {
            pages: {
                path: string;
                component: string;
            }[];
        };
        public: {
            pages: {
                path: string;
                component: string;
                template: string;
            }[];
        };
    };
    lifecycle: {
        install: string;
        activate: string;
        deactivate: string;
        uninstall: string;
    };
    permissions: {
        id: string;
        name: string;
        description: string;
        category: string;
    }[];
    menus: {
        admin: {
            id: string;
            label: string;
            icon: string;
            order: number;
            children: {
                id: string;
                label: string;
                path: string;
                icon: string;
            }[];
        }[];
    };
    exposes: {
        services: string[];
        types: string[];
        events: string[];
    };
    cpt: {
        name: string;
        storage: "entity";
        primaryKey: string;
        label: string;
        supports: string[];
    }[];
    viewTemplates: {
        id: string;
        name: string;
        description: string;
        component: string;
        dataLoader: string;
    }[];
    defaultConfig: {
        postsPerPage: number;
        enableLikes: boolean;
        enableBookmarks: boolean;
        enableComments: boolean;
        moderationEnabled: boolean;
    };
};
export default forumManifest;
//# sourceMappingURL=manifest.d.ts.map