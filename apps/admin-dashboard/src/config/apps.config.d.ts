export declare const appsConfig: {
    readonly forum: {
        readonly name: "Forum";
        readonly url: any;
        readonly apiEndpoint: "/api/v1/forum";
        readonly icon: "MessageSquare";
        readonly color: "primary";
    };
    readonly signage: {
        readonly name: "Digital Signage";
        readonly url: any;
        readonly apiEndpoint: "/api/v1/signage";
        readonly icon: "Monitor";
        readonly color: "secondary";
    };
    readonly crowdfunding: {
        readonly name: "Crowdfunding";
        readonly url: any;
        readonly apiEndpoint: "/api/v1/crowdfunding";
        readonly icon: "DollarSign";
        readonly color: "success";
    };
};
export declare const ssoConfig: {
    enabled: boolean;
    domain: any;
    cookieName: string;
    sessionCheckInterval: number;
};
export declare const apiEndpoints: {
    auth: {
        login: string;
        logout: string;
        refresh: string;
        me: string;
        ssoCheck: string;
    };
    users: {
        list: string;
        detail: (id: string) => string;
        create: string;
        update: (id: string) => string;
        delete: (id: string) => string;
        roles: string;
    };
    products: {
        list: string;
        detail: (id: string) => string;
        create: string;
        update: (id: string) => string;
        delete: (id: string) => string;
        categories: string;
    };
    orders: {
        list: string;
        detail: (id: string) => string;
        create: string;
        update: (id: string) => string;
        cancel: (id: string) => string;
        stats: string;
    };
    forum: {
        stats: string;
        posts: string;
        categories: string;
        users: string;
        moderation: string;
    };
    signage: {
        stats: string;
        displays: string;
        content: string;
        schedules: string;
        playlists: string;
    };
    crowdfunding: {
        stats: string;
        campaigns: string;
        contributions: string;
        users: string;
        payouts: string;
    };
    dashboard: {
        overview: string;
        analytics: string;
        activities: string;
        notifications: string;
    };
    settings: {
        general: string;
        appearance: string;
        email: string;
        integrations: string;
    };
};
export declare function getApiUrl(endpoint: string): string;
export declare function getAppUrl(app: keyof typeof appsConfig, path?: string): string;
//# sourceMappingURL=apps.config.d.ts.map