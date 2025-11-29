/**
 * Forum App Manifest
 *
 * Defines the forum feature as an installable/activatable app
 */
export declare const forumManifest: {
    appId: string;
    name: string;
    version: string;
    description: string;
    routes: string[];
    permissions: string[];
    menu: {
        id: string;
        label: string;
        icon: string;
        path: string;
        position: number;
        children: {
            id: string;
            label: string;
            icon: string;
            path: string;
        }[];
    };
};
export default forumManifest;
//# sourceMappingURL=manifest.d.ts.map