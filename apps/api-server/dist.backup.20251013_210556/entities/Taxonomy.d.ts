import { User } from './User';
export interface TaxonomySettings {
    hierarchical?: boolean;
    public?: boolean;
    showUI?: boolean;
    showInMenu?: boolean;
    showInNavMenus?: boolean;
    showTagcloud?: boolean;
    showInQuickEdit?: boolean;
    showAdminColumn?: boolean;
    description?: string;
    queryVar?: boolean;
    rewrite?: {
        slug?: string;
        withFront?: boolean;
        hierarchical?: boolean;
    };
    capabilities?: {
        manageTerm?: string;
        editTerm?: string;
        deleteTerm?: string;
        assignTerm?: string;
    };
    metaBoxCallback?: string;
    metaBoxSanitizeCallback?: string;
    updateCountCallback?: string;
}
export declare class Taxonomy {
    id: string;
    name: string;
    label: string;
    description: string;
    objectTypes: string[];
    labels: {
        name?: string;
        singularName?: string;
        menuName?: string;
        allItems?: string;
        editItem?: string;
        viewItem?: string;
        updateItem?: string;
        addNewItem?: string;
        newItemName?: string;
        parentItem?: string;
        parentItemColon?: string;
        searchItems?: string;
        popularItems?: string;
        separateItemsWithCommas?: string;
        addOrRemoveItems?: string;
        chooseFromMostUsed?: string;
        notFound?: string;
        noTerms?: string;
        itemsListNavigation?: string;
        itemsList?: string;
    };
    settings: TaxonomySettings;
    hierarchical: boolean;
    public: boolean;
    showUI: boolean;
    showInMenu: boolean;
    showInNavMenus: boolean;
    showTagcloud: boolean;
    showInQuickEdit: boolean;
    showAdminColumn: boolean;
    sortOrder: number;
    createdBy: string;
    creator: User;
    createdAt: Date;
    updatedAt: Date;
    terms: Term[];
}
export declare class Term {
    id: string;
    name: string;
    slug: string;
    description: string;
    count: number;
    taxonomyId: string;
    taxonomy: Taxonomy;
    parent: Term;
    children: Term[];
    meta: Record<string, any>;
    termOrder: number;
    createdAt: Date;
    updatedAt: Date;
    get level(): number;
    get fullPath(): string;
}
export declare class TermRelationship {
    id: string;
    objectId: string;
    objectType: string;
    termId: string;
    term: Term;
    termOrder: number;
    createdAt: Date;
}
//# sourceMappingURL=Taxonomy.d.ts.map