export declare class MockDataService {
    private static templates;
    private static pages;
    static initMockData(): void;
    static getTemplate(name: string): any;
    static updateTemplate(name: string, data: {
        id: string;
        name: string;
        type: string;
        layoutType: string;
        active: boolean;
        content: Array<{
            id: string;
            type: string;
            content: Record<string, unknown>;
            settings?: Record<string, unknown>;
        }>;
        version: string;
        createdAt: string;
    }): any;
    static getAllTemplates(): any[];
    static getPage(slug: string): any;
    static updatePage(slug: string, data: {
        id: string;
        title: string;
        slug: string;
        content: string;
        status: string;
        template?: string;
        createdAt: string;
    }): any;
}
//# sourceMappingURL=MockDataService.d.ts.map