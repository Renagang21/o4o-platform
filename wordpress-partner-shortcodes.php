<?php
/**
 * WordPress Partner Portal Shortcodes
 * Integrates with the O4O Partner Portal React components
 */

// Register Partner Portal Shortcodes
function register_partner_shortcodes() {
    // Main partner dashboard
    add_shortcode('partner_dashboard', 'render_partner_dashboard');
    
    // Partner products for promotion
    add_shortcode('partner_products', 'render_partner_products');
    
    // Partner commissions and settlements
    add_shortcode('partner_commissions', 'render_partner_commissions');
    
    // Additional partner shortcodes
    add_shortcode('partner_link_generator', 'render_partner_link_generator');
    add_shortcode('partner_performance_chart', 'render_partner_performance_chart');
    add_shortcode('partner_leaderboard', 'render_partner_leaderboard');
}
add_action('init', 'register_partner_shortcodes');

/**
 * Partner Dashboard Shortcode
 * Usage: [partner_dashboard tab="overview"]
 */
function render_partner_dashboard($atts) {
    $attributes = shortcode_atts(array(
        'tab' => 'overview'
    ), $atts);
    
    // Check if user is logged in and has partner role
    if (!is_user_logged_in()) {
        return '<div class="partner-login-required">
            <p>파트너 대시보드에 접근하려면 로그인이 필요합니다.</p>
            <a href="' . wp_login_url(get_permalink()) . '" class="btn btn-primary">로그인</a>
        </div>';
    }
    
    $user = wp_get_current_user();
    if (!in_array('partner', $user->roles) && !in_array('administrator', $user->roles)) {
        return '<div class="partner-role-required">
            <p>파트너 권한이 필요합니다. 파트너 신청을 먼저 진행해주세요.</p>
            <a href="/partner-apply" class="btn btn-primary">파트너 신청</a>
        </div>';
    }
    
    // Get user token for API authentication
    $token = get_user_meta($user->ID, 'api_token', true);
    if (empty($token)) {
        // Generate token if not exists
        $token = wp_generate_password(32, false);
        update_user_meta($user->ID, 'api_token', $token);
    }
    
    // Render the React component
    return sprintf(
        '<div id="partner-dashboard-root" 
             data-component="PartnerMainDashboard" 
             data-tab="%s"
             data-token="%s"
             data-api-url="%s"></div>',
        esc_attr($attributes['tab']),
        esc_attr($token),
        esc_url('https://api.neture.co.kr')
    );
}

/**
 * Partner Products Shortcode
 * Usage: [partner_products category="electronics" featured="true" limit="12" sort="commission"]
 */
function render_partner_products($atts) {
    $attributes = shortcode_atts(array(
        'category' => '',
        'featured' => 'false',
        'limit' => '12',
        'sort' => 'commission'
    ), $atts);
    
    // Check authentication
    if (!is_user_logged_in()) {
        return '<div class="partner-login-required">
            <p>상품 목록을 보려면 로그인이 필요합니다.</p>
            <a href="' . wp_login_url(get_permalink()) . '" class="btn btn-primary">로그인</a>
        </div>';
    }
    
    $user = wp_get_current_user();
    $token = get_user_meta($user->ID, 'api_token', true);
    
    return sprintf(
        '<div id="partner-products-root" 
             data-component="PartnerProducts" 
             data-category="%s"
             data-featured="%s"
             data-limit="%s"
             data-sort="%s"
             data-token="%s"
             data-api-url="%s"></div>',
        esc_attr($attributes['category']),
        esc_attr($attributes['featured']),
        esc_attr($attributes['limit']),
        esc_attr($attributes['sort']),
        esc_attr($token),
        esc_url('https://api.neture.co.kr')
    );
}

/**
 * Partner Commissions Shortcode
 * Usage: [partner_commissions period="30d" status="all" compact="false"]
 */
function render_partner_commissions($atts) {
    $attributes = shortcode_atts(array(
        'period' => '30d',
        'status' => 'all',
        'compact' => 'false',
        'show_summary' => 'true'
    ), $atts);
    
    // Check authentication
    if (!is_user_logged_in()) {
        return '<div class="partner-login-required">
            <p>정산 내역을 보려면 로그인이 필요합니다.</p>
            <a href="' . wp_login_url(get_permalink()) . '" class="btn btn-primary">로그인</a>
        </div>';
    }
    
    $user = wp_get_current_user();
    if (!in_array('partner', $user->roles) && !in_array('administrator', $user->roles)) {
        return '<div class="partner-role-required">
            <p>파트너 권한이 필요합니다.</p>
        </div>';
    }
    
    $token = get_user_meta($user->ID, 'api_token', true);
    
    return sprintf(
        '<div id="partner-commissions-root" 
             data-component="PartnerCommissions" 
             data-period="%s"
             data-status="%s"
             data-compact="%s"
             data-show-summary="%s"
             data-token="%s"
             data-api-url="%s"></div>',
        esc_attr($attributes['period']),
        esc_attr($attributes['status']),
        esc_attr($attributes['compact']),
        esc_attr($attributes['show_summary']),
        esc_attr($token),
        esc_url('https://api.neture.co.kr')
    );
}

/**
 * Partner Link Generator Shortcode
 * Usage: [partner_link_generator]
 */
function render_partner_link_generator($atts) {
    if (!is_user_logged_in()) {
        return '<div class="partner-login-required">
            <p>링크 생성기를 사용하려면 로그인이 필요합니다.</p>
            <a href="' . wp_login_url(get_permalink()) . '" class="btn btn-primary">로그인</a>
        </div>';
    }
    
    $user = wp_get_current_user();
    if (!in_array('partner', $user->roles) && !in_array('administrator', $user->roles)) {
        return '<div class="partner-role-required">
            <p>파트너 권한이 필요합니다.</p>
        </div>';
    }
    
    $token = get_user_meta($user->ID, 'api_token', true);
    
    return sprintf(
        '<div id="partner-link-generator-root" 
             data-component="PartnerLinkGenerator" 
             data-token="%s"
             data-api-url="%s"></div>',
        esc_attr($token),
        esc_url('https://api.neture.co.kr')
    );
}

/**
 * Partner Performance Chart Shortcode
 * Usage: [partner_performance_chart type="line"]
 */
function render_partner_performance_chart($atts) {
    $attributes = shortcode_atts(array(
        'type' => 'line'
    ), $atts);
    
    if (!is_user_logged_in()) {
        return '<div class="partner-login-required">
            <p>성과 차트를 보려면 로그인이 필요합니다.</p>
        </div>';
    }
    
    $user = wp_get_current_user();
    $token = get_user_meta($user->ID, 'api_token', true);
    
    return sprintf(
        '<div id="partner-performance-chart-root" 
             data-component="PerformanceChart" 
             data-chart-type="%s"
             data-token="%s"
             data-api-url="%s"></div>',
        esc_attr($attributes['type']),
        esc_attr($token),
        esc_url('https://api.neture.co.kr')
    );
}

/**
 * Partner Leaderboard Shortcode
 * Usage: [partner_leaderboard period="monthly" limit="10"]
 */
function render_partner_leaderboard($atts) {
    $attributes = shortcode_atts(array(
        'period' => 'monthly',
        'limit' => '10'
    ), $atts);
    
    return sprintf(
        '<div id="partner-leaderboard-root" 
             data-component="Leaderboard" 
             data-period="%s"
             data-limit="%s"
             data-api-url="%s"></div>',
        esc_attr($attributes['period']),
        esc_attr($attributes['limit']),
        esc_url('https://api.neture.co.kr')
    );
}

// Enqueue partner portal assets
function enqueue_partner_portal_assets() {
    if (is_page() && has_shortcode(get_post()->post_content, 'partner_')) {
        // React and dependencies
        wp_enqueue_script('react', 'https://unpkg.com/react@18/umd/react.production.min.js', array(), '18.0.0');
        wp_enqueue_script('react-dom', 'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js', array('react'), '18.0.0');
        
        // Partner portal bundle
        wp_enqueue_script(
            'partner-portal',
            'https://admin.neture.co.kr/partner-portal.js',
            array('react', 'react-dom'),
            '1.0.0',
            true
        );
        
        // Partner portal styles
        wp_enqueue_style(
            'partner-portal-styles',
            'https://admin.neture.co.kr/partner-portal.css',
            array(),
            '1.0.0'
        );
        
        // Localize script with user data
        if (is_user_logged_in()) {
            $user = wp_get_current_user();
            wp_localize_script('partner-portal', 'partnerPortalData', array(
                'userId' => $user->ID,
                'userEmail' => $user->user_email,
                'userName' => $user->display_name,
                'userRole' => implode(',', $user->roles),
                'apiUrl' => 'https://api.neture.co.kr',
                'nonce' => wp_create_nonce('partner_portal_nonce')
            ));
        }
    }
}
add_action('wp_enqueue_scripts', 'enqueue_partner_portal_assets');

// AJAX endpoint for partner operations
function handle_partner_ajax() {
    check_ajax_referer('partner_portal_nonce', 'nonce');
    
    $action = $_POST['partner_action'];
    $user_id = get_current_user_id();
    
    if (!$user_id) {
        wp_die('Not authenticated');
    }
    
    switch ($action) {
        case 'get_token':
            $token = get_user_meta($user_id, 'api_token', true);
            if (empty($token)) {
                $token = wp_generate_password(32, false);
                update_user_meta($user_id, 'api_token', $token);
            }
            wp_send_json_success(array('token' => $token));
            break;
            
        case 'refresh_token':
            $token = wp_generate_password(32, false);
            update_user_meta($user_id, 'api_token', $token);
            wp_send_json_success(array('token' => $token));
            break;
            
        default:
            wp_send_json_error('Invalid action');
    }
}
add_action('wp_ajax_partner_portal_action', 'handle_partner_ajax');

// Add partner role if not exists
function add_partner_role() {
    if (!get_role('partner')) {
        add_role('partner', '파트너', array(
            'read' => true,
            'edit_posts' => false,
            'delete_posts' => false,
            'publish_posts' => false,
            'upload_files' => false,
        ));
    }
}
add_action('init', 'add_partner_role');

// Partner registration endpoint
function register_partner_endpoints() {
    add_rewrite_rule('^partner/apply/?', 'index.php?partner_apply=1', 'top');
    add_rewrite_rule('^partner/dashboard/?', 'index.php?partner_dashboard=1', 'top');
}
add_action('init', 'register_partner_endpoints');

// Query vars
function partner_query_vars($vars) {
    $vars[] = 'partner_apply';
    $vars[] = 'partner_dashboard';
    return $vars;
}
add_filter('query_vars', 'partner_query_vars');

// Template redirect
function partner_template_redirect() {
    if (get_query_var('partner_apply')) {
        include(plugin_dir_path(__FILE__) . 'templates/partner-apply.php');
        exit;
    }
    
    if (get_query_var('partner_dashboard')) {
        if (!is_user_logged_in()) {
            wp_redirect(wp_login_url('/partner/dashboard'));
            exit;
        }
        include(plugin_dir_path(__FILE__) . 'templates/partner-dashboard.php');
        exit;
    }
}
add_action('template_redirect', 'partner_template_redirect');

?>