<?php
/**
 * Plugin Name: O4O Test CPT & ACF
 * Description: Creates test custom post types and ACF fields for testing the CPT/ACF Loop block
 * Version: 1.0.0
 * Author: O4O Team
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Register test custom post types
 */
function o4o_register_test_cpts() {
    // Products CPT
    register_post_type('product', array(
        'labels' => array(
            'name' => 'Products',
            'singular_name' => 'Product',
            'add_new' => 'Add New Product',
            'add_new_item' => 'Add New Product',
            'edit_item' => 'Edit Product',
            'new_item' => 'New Product',
            'view_item' => 'View Product',
            'search_items' => 'Search Products',
            'not_found' => 'No products found',
            'not_found_in_trash' => 'No products found in trash',
        ),
        'public' => true,
        'has_archive' => true,
        'supports' => array('title', 'editor', 'thumbnail', 'excerpt', 'custom-fields'),
        'taxonomies' => array('product_category', 'product_tag'),
        'show_in_rest' => true,
        'rest_base' => 'products',
        'menu_icon' => 'dashicons-cart',
    ));
    
    // Events CPT
    register_post_type('event', array(
        'labels' => array(
            'name' => 'Events',
            'singular_name' => 'Event',
            'add_new' => 'Add New Event',
            'add_new_item' => 'Add New Event',
            'edit_item' => 'Edit Event',
            'new_item' => 'New Event',
            'view_item' => 'View Event',
            'search_items' => 'Search Events',
            'not_found' => 'No events found',
            'not_found_in_trash' => 'No events found in trash',
        ),
        'public' => true,
        'has_archive' => true,
        'supports' => array('title', 'editor', 'thumbnail', 'excerpt', 'custom-fields'),
        'taxonomies' => array('event_type'),
        'show_in_rest' => true,
        'rest_base' => 'events',
        'menu_icon' => 'dashicons-calendar-alt',
    ));
    
    // Team Members CPT
    register_post_type('team_member', array(
        'labels' => array(
            'name' => 'Team Members',
            'singular_name' => 'Team Member',
            'add_new' => 'Add New Team Member',
            'add_new_item' => 'Add New Team Member',
            'edit_item' => 'Edit Team Member',
            'new_item' => 'New Team Member',
            'view_item' => 'View Team Member',
            'search_items' => 'Search Team Members',
            'not_found' => 'No team members found',
            'not_found_in_trash' => 'No team members found in trash',
        ),
        'public' => true,
        'has_archive' => true,
        'supports' => array('title', 'editor', 'thumbnail', 'excerpt', 'custom-fields'),
        'taxonomies' => array('department'),
        'show_in_rest' => true,
        'rest_base' => 'team_members',
        'menu_icon' => 'dashicons-groups',
    ));
}
add_action('init', 'o4o_register_test_cpts');

/**
 * Register test taxonomies
 */
function o4o_register_test_taxonomies() {
    // Product Category
    register_taxonomy('product_category', array('product'), array(
        'labels' => array(
            'name' => 'Product Categories',
            'singular_name' => 'Product Category',
            'search_items' => 'Search Categories',
            'all_items' => 'All Categories',
            'parent_item' => 'Parent Category',
            'parent_item_colon' => 'Parent Category:',
            'edit_item' => 'Edit Category',
            'update_item' => 'Update Category',
            'add_new_item' => 'Add New Category',
            'new_item_name' => 'New Category Name',
            'menu_name' => 'Categories',
        ),
        'hierarchical' => true,
        'show_ui' => true,
        'show_in_rest' => true,
        'query_var' => true,
        'rewrite' => array('slug' => 'product-category'),
    ));
    
    // Product Tag
    register_taxonomy('product_tag', array('product'), array(
        'labels' => array(
            'name' => 'Product Tags',
            'singular_name' => 'Product Tag',
            'search_items' => 'Search Tags',
            'popular_items' => 'Popular Tags',
            'all_items' => 'All Tags',
            'edit_item' => 'Edit Tag',
            'update_item' => 'Update Tag',
            'add_new_item' => 'Add New Tag',
            'new_item_name' => 'New Tag Name',
            'menu_name' => 'Tags',
        ),
        'hierarchical' => false,
        'show_ui' => true,
        'show_in_rest' => true,
        'query_var' => true,
        'rewrite' => array('slug' => 'product-tag'),
    ));
    
    // Event Type
    register_taxonomy('event_type', array('event'), array(
        'labels' => array(
            'name' => 'Event Types',
            'singular_name' => 'Event Type',
            'search_items' => 'Search Types',
            'all_items' => 'All Types',
            'edit_item' => 'Edit Type',
            'update_item' => 'Update Type',
            'add_new_item' => 'Add New Type',
            'new_item_name' => 'New Type Name',
            'menu_name' => 'Event Types',
        ),
        'hierarchical' => true,
        'show_ui' => true,
        'show_in_rest' => true,
        'query_var' => true,
        'rewrite' => array('slug' => 'event-type'),
    ));
    
    // Department
    register_taxonomy('department', array('team_member'), array(
        'labels' => array(
            'name' => 'Departments',
            'singular_name' => 'Department',
            'search_items' => 'Search Departments',
            'all_items' => 'All Departments',
            'edit_item' => 'Edit Department',
            'update_item' => 'Update Department',
            'add_new_item' => 'Add New Department',
            'new_item_name' => 'New Department Name',
            'menu_name' => 'Departments',
        ),
        'hierarchical' => true,
        'show_ui' => true,
        'show_in_rest' => true,
        'query_var' => true,
        'rewrite' => array('slug' => 'department'),
    ));
}
add_action('init', 'o4o_register_test_taxonomies');

/**
 * Register ACF field groups programmatically
 */
function o4o_register_test_acf_fields() {
    if (!function_exists('acf_add_local_field_group')) {
        return;
    }
    
    // Product Fields
    acf_add_local_field_group(array(
        'key' => 'group_product_fields',
        'title' => 'Product Details',
        'fields' => array(
            array(
                'key' => 'field_product_price',
                'label' => 'Price',
                'name' => 'price',
                'type' => 'number',
                'prefix' => '$',
                'min' => 0,
                'step' => 0.01,
            ),
            array(
                'key' => 'field_product_sale_price',
                'label' => 'Sale Price',
                'name' => 'sale_price',
                'type' => 'number',
                'prefix' => '$',
                'min' => 0,
                'step' => 0.01,
            ),
            array(
                'key' => 'field_product_sku',
                'label' => 'SKU',
                'name' => 'sku',
                'type' => 'text',
            ),
            array(
                'key' => 'field_product_in_stock',
                'label' => 'In Stock',
                'name' => 'in_stock',
                'type' => 'true_false',
                'default_value' => 1,
            ),
            array(
                'key' => 'field_product_stock_quantity',
                'label' => 'Stock Quantity',
                'name' => 'stock_quantity',
                'type' => 'number',
                'min' => 0,
                'conditional_logic' => array(
                    array(
                        array(
                            'field' => 'field_product_in_stock',
                            'operator' => '==',
                            'value' => '1',
                        ),
                    ),
                ),
            ),
            array(
                'key' => 'field_product_features',
                'label' => 'Features',
                'name' => 'features',
                'type' => 'repeater',
                'layout' => 'table',
                'sub_fields' => array(
                    array(
                        'key' => 'field_product_feature_item',
                        'label' => 'Feature',
                        'name' => 'feature',
                        'type' => 'text',
                    ),
                ),
            ),
            array(
                'key' => 'field_product_gallery',
                'label' => 'Product Gallery',
                'name' => 'product_gallery',
                'type' => 'gallery',
                'return_format' => 'array',
            ),
            array(
                'key' => 'field_product_download',
                'label' => 'Product Manual',
                'name' => 'product_manual',
                'type' => 'file',
                'return_format' => 'array',
            ),
        ),
        'location' => array(
            array(
                array(
                    'param' => 'post_type',
                    'operator' => '==',
                    'value' => 'product',
                ),
            ),
        ),
        'show_in_rest' => true,
    ));
    
    // Event Fields
    acf_add_local_field_group(array(
        'key' => 'group_event_fields',
        'title' => 'Event Details',
        'fields' => array(
            array(
                'key' => 'field_event_date',
                'label' => 'Event Date',
                'name' => 'event_date',
                'type' => 'date_picker',
                'display_format' => 'F j, Y',
                'return_format' => 'Y-m-d',
                'first_day' => 1,
                'required' => 1,
            ),
            array(
                'key' => 'field_event_start_time',
                'label' => 'Start Time',
                'name' => 'start_time',
                'type' => 'time_picker',
                'display_format' => 'g:i a',
                'return_format' => 'H:i',
            ),
            array(
                'key' => 'field_event_end_time',
                'label' => 'End Time',
                'name' => 'end_time',
                'type' => 'time_picker',
                'display_format' => 'g:i a',
                'return_format' => 'H:i',
            ),
            array(
                'key' => 'field_event_location',
                'label' => 'Location',
                'name' => 'location',
                'type' => 'text',
                'required' => 1,
            ),
            array(
                'key' => 'field_event_venue_map',
                'label' => 'Venue Map',
                'name' => 'venue_map',
                'type' => 'google_map',
                'center_lat' => '37.5665',
                'center_lng' => '126.9780',
                'zoom' => 14,
            ),
            array(
                'key' => 'field_event_ticket_price',
                'label' => 'Ticket Price',
                'name' => 'ticket_price',
                'type' => 'number',
                'prefix' => '$',
                'min' => 0,
            ),
            array(
                'key' => 'field_event_registration_url',
                'label' => 'Registration URL',
                'name' => 'registration_url',
                'type' => 'url',
            ),
            array(
                'key' => 'field_event_max_attendees',
                'label' => 'Max Attendees',
                'name' => 'max_attendees',
                'type' => 'number',
                'min' => 1,
            ),
            array(
                'key' => 'field_event_speaker',
                'label' => 'Speakers',
                'name' => 'speakers',
                'type' => 'relationship',
                'post_type' => array('team_member'),
                'return_format' => 'object',
                'multiple' => 1,
            ),
        ),
        'location' => array(
            array(
                array(
                    'param' => 'post_type',
                    'operator' => '==',
                    'value' => 'event',
                ),
            ),
        ),
        'show_in_rest' => true,
    ));
    
    // Team Member Fields
    acf_add_local_field_group(array(
        'key' => 'group_team_fields',
        'title' => 'Team Member Details',
        'fields' => array(
            array(
                'key' => 'field_team_position',
                'label' => 'Position',
                'name' => 'position',
                'type' => 'text',
                'required' => 1,
            ),
            array(
                'key' => 'field_team_email',
                'label' => 'Email',
                'name' => 'email',
                'type' => 'email',
            ),
            array(
                'key' => 'field_team_phone',
                'label' => 'Phone',
                'name' => 'phone',
                'type' => 'text',
            ),
            array(
                'key' => 'field_team_bio',
                'label' => 'Biography',
                'name' => 'biography',
                'type' => 'wysiwyg',
                'toolbar' => 'basic',
                'media_upload' => 0,
            ),
            array(
                'key' => 'field_team_skills',
                'label' => 'Skills',
                'name' => 'skills',
                'type' => 'checkbox',
                'choices' => array(
                    'leadership' => 'Leadership',
                    'communication' => 'Communication',
                    'project_management' => 'Project Management',
                    'design' => 'Design',
                    'development' => 'Development',
                    'marketing' => 'Marketing',
                    'sales' => 'Sales',
                    'support' => 'Customer Support',
                ),
                'layout' => 'horizontal',
                'return_format' => 'label',
            ),
            array(
                'key' => 'field_team_social_media',
                'label' => 'Social Media',
                'name' => 'social_media',
                'type' => 'group',
                'layout' => 'row',
                'sub_fields' => array(
                    array(
                        'key' => 'field_team_linkedin',
                        'label' => 'LinkedIn',
                        'name' => 'linkedin',
                        'type' => 'url',
                    ),
                    array(
                        'key' => 'field_team_twitter',
                        'label' => 'Twitter',
                        'name' => 'twitter',
                        'type' => 'url',
                    ),
                    array(
                        'key' => 'field_team_github',
                        'label' => 'GitHub',
                        'name' => 'github',
                        'type' => 'url',
                    ),
                ),
            ),
            array(
                'key' => 'field_team_highlight_color',
                'label' => 'Highlight Color',
                'name' => 'highlight_color',
                'type' => 'color_picker',
                'default_value' => '#0073aa',
            ),
        ),
        'location' => array(
            array(
                array(
                    'param' => 'post_type',
                    'operator' => '==',
                    'value' => 'team_member',
                ),
            ),
        ),
        'show_in_rest' => true,
    ));
}
add_action('acf/init', 'o4o_register_test_acf_fields');

/**
 * Create sample data on activation
 */
function o4o_create_sample_data() {
    // Check if sample data already exists
    $existing = get_posts(array(
        'post_type' => array('product', 'event', 'team_member'),
        'posts_per_page' => 1,
    ));
    
    if (!empty($existing)) {
        return;
    }
    
    // Create sample categories and tags
    $electronics_cat = wp_insert_term('Electronics', 'product_category');
    $furniture_cat = wp_insert_term('Furniture', 'product_category');
    $clothing_cat = wp_insert_term('Clothing', 'product_category');
    
    $conference_type = wp_insert_term('Conference', 'event_type');
    $workshop_type = wp_insert_term('Workshop', 'event_type');
    $webinar_type = wp_insert_term('Webinar', 'event_type');
    
    $engineering_dept = wp_insert_term('Engineering', 'department');
    $marketing_dept = wp_insert_term('Marketing', 'department');
    $sales_dept = wp_insert_term('Sales', 'department');
    
    // Create sample products
    $products = array(
        array(
            'post_title' => 'Premium Wireless Headphones',
            'post_content' => 'Experience crystal-clear audio with our premium wireless headphones. Featuring active noise cancellation and 30-hour battery life.',
            'post_excerpt' => 'High-quality wireless headphones with ANC.',
            'post_status' => 'publish',
            'post_type' => 'product',
            'meta_input' => array(
                'price' => 299.99,
                'sale_price' => 249.99,
                'sku' => 'WH-001',
                'in_stock' => 1,
                'stock_quantity' => 50,
            ),
        ),
        array(
            'post_title' => 'Ergonomic Office Chair',
            'post_content' => 'Designed for maximum comfort during long work sessions. Features lumbar support and adjustable height.',
            'post_excerpt' => 'Comfortable office chair with ergonomic design.',
            'post_status' => 'publish',
            'post_type' => 'product',
            'meta_input' => array(
                'price' => 599.00,
                'sku' => 'CH-002',
                'in_stock' => 1,
                'stock_quantity' => 25,
            ),
        ),
        array(
            'post_title' => 'Smart Watch Pro',
            'post_content' => 'Stay connected with our latest smartwatch. Track your fitness, receive notifications, and monitor your health.',
            'post_excerpt' => 'Advanced smartwatch with health tracking.',
            'post_status' => 'publish',
            'post_type' => 'product',
            'meta_input' => array(
                'price' => 399.99,
                'sale_price' => 349.99,
                'sku' => 'SW-003',
                'in_stock' => 1,
                'stock_quantity' => 100,
            ),
        ),
    );
    
    foreach ($products as $index => $product) {
        $post_id = wp_insert_post($product);
        
        // Assign categories
        if ($index === 0 || $index === 2) {
            wp_set_object_terms($post_id, $electronics_cat['term_id'], 'product_category');
        } else {
            wp_set_object_terms($post_id, $furniture_cat['term_id'], 'product_category');
        }
        
        // Add features
        if (function_exists('update_field')) {
            update_field('features', array(
                array('feature' => 'High quality materials'),
                array('feature' => '1 year warranty'),
                array('feature' => 'Free shipping'),
            ), $post_id);
        }
    }
    
    // Create sample events
    $events = array(
        array(
            'post_title' => 'Tech Innovation Conference 2025',
            'post_content' => 'Join us for the biggest tech conference of the year. Learn from industry leaders and network with professionals.',
            'post_excerpt' => 'Annual technology conference featuring top speakers.',
            'post_status' => 'publish',
            'post_type' => 'event',
            'meta_input' => array(
                'event_date' => date('Y-m-d', strtotime('+30 days')),
                'start_time' => '09:00',
                'end_time' => '18:00',
                'location' => 'Convention Center, Seoul',
                'ticket_price' => 299,
                'max_attendees' => 500,
                'registration_url' => 'https://example.com/register',
            ),
        ),
        array(
            'post_title' => 'WordPress Development Workshop',
            'post_content' => 'Learn advanced WordPress development techniques in this hands-on workshop.',
            'post_excerpt' => 'Practical workshop for WordPress developers.',
            'post_status' => 'publish',
            'post_type' => 'event',
            'meta_input' => array(
                'event_date' => date('Y-m-d', strtotime('+14 days')),
                'start_time' => '14:00',
                'end_time' => '17:00',
                'location' => 'Online',
                'ticket_price' => 99,
                'max_attendees' => 100,
                'registration_url' => 'https://example.com/workshop',
            ),
        ),
        array(
            'post_title' => 'Marketing Strategy Webinar',
            'post_content' => 'Discover the latest marketing strategies for 2025 in this informative webinar.',
            'post_excerpt' => 'Free webinar on modern marketing techniques.',
            'post_status' => 'publish',
            'post_type' => 'event',
            'meta_input' => array(
                'event_date' => date('Y-m-d', strtotime('+7 days')),
                'start_time' => '11:00',
                'end_time' => '12:30',
                'location' => 'Online',
                'ticket_price' => 0,
                'max_attendees' => 1000,
                'registration_url' => 'https://example.com/webinar',
            ),
        ),
    );
    
    foreach ($events as $index => $event) {
        $post_id = wp_insert_post($event);
        
        // Assign event types
        if ($index === 0) {
            wp_set_object_terms($post_id, $conference_type['term_id'], 'event_type');
        } elseif ($index === 1) {
            wp_set_object_terms($post_id, $workshop_type['term_id'], 'event_type');
        } else {
            wp_set_object_terms($post_id, $webinar_type['term_id'], 'event_type');
        }
    }
    
    // Create sample team members
    $team_members = array(
        array(
            'post_title' => 'John Smith',
            'post_content' => 'John is our CTO with over 15 years of experience in software development.',
            'post_excerpt' => 'Chief Technology Officer',
            'post_status' => 'publish',
            'post_type' => 'team_member',
            'meta_input' => array(
                'position' => 'Chief Technology Officer',
                'email' => 'john.smith@example.com',
                'phone' => '+1 (555) 123-4567',
                'highlight_color' => '#2c3e50',
            ),
        ),
        array(
            'post_title' => 'Sarah Johnson',
            'post_content' => 'Sarah leads our marketing team with innovative strategies and creative campaigns.',
            'post_excerpt' => 'Marketing Director',
            'post_status' => 'publish',
            'post_type' => 'team_member',
            'meta_input' => array(
                'position' => 'Marketing Director',
                'email' => 'sarah.johnson@example.com',
                'phone' => '+1 (555) 234-5678',
                'highlight_color' => '#e74c3c',
            ),
        ),
        array(
            'post_title' => 'Michael Chen',
            'post_content' => 'Michael is a senior developer specializing in WordPress and React development.',
            'post_excerpt' => 'Senior Developer',
            'post_status' => 'publish',
            'post_type' => 'team_member',
            'meta_input' => array(
                'position' => 'Senior Developer',
                'email' => 'michael.chen@example.com',
                'phone' => '+1 (555) 345-6789',
                'highlight_color' => '#3498db',
            ),
        ),
    );
    
    foreach ($team_members as $index => $member) {
        $post_id = wp_insert_post($member);
        
        // Assign departments
        if ($index === 0 || $index === 2) {
            wp_set_object_terms($post_id, $engineering_dept['term_id'], 'department');
        } else {
            wp_set_object_terms($post_id, $marketing_dept['term_id'], 'department');
        }
        
        // Add skills and social media
        if (function_exists('update_field')) {
            if ($index === 0) {
                update_field('skills', array('leadership', 'development', 'project_management'), $post_id);
                update_field('social_media', array(
                    'linkedin' => 'https://linkedin.com/in/johnsmith',
                    'github' => 'https://github.com/johnsmith',
                ), $post_id);
            } elseif ($index === 1) {
                update_field('skills', array('leadership', 'marketing', 'communication'), $post_id);
                update_field('social_media', array(
                    'linkedin' => 'https://linkedin.com/in/sarahjohnson',
                    'twitter' => 'https://twitter.com/sarahjohnson',
                ), $post_id);
            } else {
                update_field('skills', array('development', 'design', 'support'), $post_id);
                update_field('social_media', array(
                    'linkedin' => 'https://linkedin.com/in/michaelchen',
                    'github' => 'https://github.com/michaelchen',
                ), $post_id);
            }
        }
    }
}

// Create sample data on plugin activation
register_activation_hook(__FILE__, 'o4o_create_sample_data');

// Add admin notice
add_action('admin_notices', function() {
    if (get_transient('o4o_test_cpt_activated')) {
        ?>
        <div class="notice notice-success is-dismissible">
            <p><?php _e('O4O Test CPT & ACF plugin activated! Sample posts, events, and team members have been created.', 'o4o'); ?></p>
        </div>
        <?php
        delete_transient('o4o_test_cpt_activated');
    }
});

// Set transient on activation
register_activation_hook(__FILE__, function() {
    set_transient('o4o_test_cpt_activated', true, 5);
});