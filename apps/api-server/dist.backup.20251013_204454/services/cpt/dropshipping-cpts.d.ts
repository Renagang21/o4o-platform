export declare const DROPSHIPPING_CPT_DEFINITIONS: ({
    name: string;
    label: string;
    singular_label: string;
    description: string;
    menu_icon: string;
    menu_position: number;
    supports: string[];
    public: boolean;
    show_ui: boolean;
    show_in_menu: boolean;
    show_in_rest: boolean;
    has_archive: boolean;
    rewrite: {
        slug: string;
    };
    capabilities: {
        edit_post: string;
        read_post: string;
        delete_post: string;
        edit_posts: string;
        edit_others_posts: string;
        publish_posts: string;
        read_private_posts: string;
    };
    labels: {
        add_new: string;
        add_new_item: string;
        edit_item: string;
        new_item: string;
        view_item: string;
        search_items: string;
        not_found: string;
        not_found_in_trash: string;
    };
    taxonomies?: undefined;
} | {
    name: string;
    label: string;
    singular_label: string;
    description: string;
    menu_icon: string;
    menu_position: number;
    supports: string[];
    public: boolean;
    show_ui: boolean;
    show_in_menu: boolean;
    show_in_rest: boolean;
    has_archive: boolean;
    rewrite: {
        slug: string;
    };
    taxonomies: string[];
    capabilities: {
        edit_post: string;
        read_post: string;
        delete_post: string;
        edit_posts: string;
        edit_others_posts: string;
        publish_posts: string;
        read_private_posts: string;
    };
    labels: {
        add_new: string;
        add_new_item: string;
        edit_item: string;
        new_item: string;
        view_item: string;
        search_items: string;
        not_found: string;
        not_found_in_trash: string;
    };
})[];
export declare function registerDropshippingCPTs(): Promise<void>;
//# sourceMappingURL=dropshipping-cpts.d.ts.map