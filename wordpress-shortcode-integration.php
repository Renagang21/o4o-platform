<?php
/**
 * WordPress Shortcode Integration for Dropshipping Partner Portal
 * 
 * This file should be added to your WordPress theme's functions.php
 * or created as a custom plugin.
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class DropshippingShortcodes {
    
    private $shortcodes = [
        'partner_dashboard' => [
            'description' => 'Partner Main Dashboard - 총 수익, 전환율, 개인 추천 링크를 보여주는 통합 UI',
            'callback' => 'render_partner_dashboard',
            'attributes' => [
                'tab' => 'overview'
            ]
        ],
        'partner_products' => [
            'description' => 'Partner Products List - 파트너 개인의 추천 코드가 적용된 링크 생성 기능',
            'callback' => 'render_partner_products',
            'attributes' => [
                'category' => '',
                'featured' => false,
                'limit' => 12,
                'sortby' => 'commission'
            ]
        ],
        'partner_commissions' => [
            'description' => 'Partner Commissions - 수수료 정산 내역과 지급 상태를 보여주는 투명한 UI',
            'callback' => 'render_partner_commissions',
            'attributes' => [
                'period' => '30d',
                'status' => 'all',
                'compact' => false,
                'showsummary' => true
            ]
        ],
        'partner_link_generator' => [
            'description' => 'Partner Link Generator - Generate promotional links',
            'callback' => 'render_partner_link_generator',
            'attributes' => []
        ],
        'partner_commission_dashboard' => [
            'description' => 'Detailed Commission Dashboard',
            'callback' => 'render_partner_commission_dashboard',
            'attributes' => [
                'daterange' => '30d'
            ]
        ],
        'partner_payout_requests' => [
            'description' => 'Payout Requests Management',
            'callback' => 'render_partner_payout_requests',
            'attributes' => []
        ],
        // Supplier Shortcodes
        'supplier_products' => [
            'description' => '공급자 상품 목록 - 자신이 등록/관리하는 ds_product 목록 출력',
            'callback' => 'render_supplier_products',
            'attributes' => [
                'limit' => 12,
                'category' => '',
                'status' => 'all',
                'showstats' => true
            ]
        ],
        'supplier_product_editor' => [
            'description' => '공급자 상품 편집기 - 공급가, MSRP, 수수료율 편집 및 승인 요청',
            'callback' => 'render_supplier_product_editor',
            'attributes' => [
                'productid' => '',
                'mode' => 'edit',
                'autosave' => false
            ]
        ],
        'supplier_dashboard' => [
            'description' => '공급자 메인 대시보드',
            'callback' => 'render_supplier_dashboard',
            'attributes' => [
                'period' => '30d'
            ]
        ],
        // Seller Shortcodes (판매자 전용)
        'seller_dashboard' => [
            'description' => '판매자 대시보드 - 총 마진, 전환율, 개인 추천 링크',
            'callback' => 'render_seller_dashboard',
            'attributes' => [
                'period' => '30d'
            ]
        ],
        'seller_products' => [
            'description' => '판매자 홍보 상품 목록 - 자율 가격 설정 및 추천 링크 생성',
            'callback' => 'render_seller_products',
            'attributes' => [
                'limit' => 12,
                'category' => '',
                'featured' => false
            ]
        ],
        'seller_settlement' => [
            'description' => '판매자 정산 내역 - 마진 정산 내역과 지급 상태',
            'callback' => 'render_seller_settlement',
            'attributes' => [
                'period' => '30d',
                'status' => 'all'
            ]
        ],
        'user_dashboard' => [
            'description' => 'User role-based dashboard',
            'callback' => 'render_user_dashboard',
            'attributes' => [
                'role' => ''
            ]
        ],
        'role_verification' => [
            'description' => 'Role verification form',
            'callback' => 'render_role_verification',
            'attributes' => [
                'type' => 'partner'
            ]
        ],
        // Admin Shortcodes
        'admin_approval_queue' => [
            'description' => '관리자 승인 대기 목록 - 가격 및 정책 변경 승인 관리',
            'callback' => 'render_admin_approval_queue',
            'attributes' => [
                'filter' => 'pending',
                'autorefresh' => true,
                'refreshinterval' => 30000
            ]
        ],
        'admin_platform_stats' => [
            'description' => '플랫폼 운영 요약 대시보드 - 매출, 수익, 정산 현황',
            'callback' => 'render_admin_platform_stats',
            'attributes' => [
                'autorefresh' => true,
                'refreshinterval' => 60000
            ]
        ]
    ];
    
    public function __construct() {
        add_action('init', [$this, 'register_shortcodes']);
        add_action('wp_enqueue_scripts', [$this, 'enqueue_scripts']);
        add_action('wp_head', [$this, 'add_auth_meta']);
        
        // Admin features
        if (is_admin()) {
            add_action('admin_menu', [$this, 'add_admin_menu']);
            add_action('media_buttons', [$this, 'add_shortcode_button']);
        }
    }
    
    /**
     * Register all shortcodes
     */
    public function register_shortcodes() {
        foreach ($this->shortcodes as $tag => $config) {
            add_shortcode($tag, [$this, $config['callback']]);
        }
    }
    
    /**
     * Enqueue necessary scripts and styles
     */
    public function enqueue_scripts() {
        // React dependencies (if not already loaded)
        wp_enqueue_script('react', 'https://unpkg.com/react@17/umd/react.production.min.js', [], '17.0.0', true);
        wp_enqueue_script('react-dom', 'https://unpkg.com/react-dom@17/umd/react-dom.production.min.js', ['react'], '17.0.0', true);
        
        // Your admin dashboard bundle (adjust URL as needed)
        wp_enqueue_script(
            'dropshipping-shortcodes', 
            get_template_directory_uri() . '/assets/js/dropshipping-shortcodes.js',
            ['react', 'react-dom'], 
            '1.0.0', 
            true
        );
        
        // Shortcode configuration
        wp_enqueue_script(
            'shortcode-config',
            get_template_directory_uri() . '/assets/js/shortcode-config.js',
            ['dropshipping-shortcodes'],
            '1.0.0',
            true
        );
        
        // Styling
        wp_enqueue_style(
            'dropshipping-shortcodes-style',
            get_template_directory_uri() . '/assets/css/dropshipping-shortcodes.css',
            [],
            '1.0.0'
        );
        
        // Pass configuration to JavaScript
        wp_localize_script('dropshipping-shortcodes', 'dropshippingConfig', [
            'apiUrl' => home_url('/api/v1'),
            'nonce' => wp_create_nonce('dropshipping_nonce'),
            'currentUser' => get_current_user_id(),
            'isLoggedIn' => is_user_logged_in()
        ]);
    }
    
    /**
     * Add authentication meta to head
     */
    public function add_auth_meta() {
        if (is_user_logged_in()) {
            $user_token = get_user_meta(get_current_user_id(), 'dropshipping_token', true);
            if ($user_token) {
                echo '<meta name="dropshipping-token" content="' . esc_attr($user_token) . '">';
            }
        }
    }
    
    /**
     * Generic shortcode renderer
     */
    private function render_shortcode($shortcode_name, $atts, $content = '') {
        // Check authentication for partner/supplier/seller/admin shortcodes
        $protected_prefixes = ['partner_', 'supplier_', 'seller_', 'admin_'];
        $requires_auth = false;
        foreach ($protected_prefixes as $prefix) {
            if (strpos($shortcode_name, $prefix) === 0) {
                $requires_auth = true;
                break;
            }
        }
        
        if ($requires_auth && !is_user_logged_in()) {
            $feature_type = explode('_', $shortcode_name)[0];
            return '<div class="shortcode-auth-required">
                <p>Please <a href="' . wp_login_url(get_permalink()) . '">log in</a> to access ' . $feature_type . ' features.</p>
            </div>';
        }
        
        // Generate unique container ID
        $container_id = 'shortcode-' . $shortcode_name . '-' . uniqid();
        
        // Prepare attributes
        $default_atts = $this->shortcodes[$shortcode_name]['attributes'] ?? [];
        $final_atts = shortcode_atts($default_atts, $atts);
        
        // Encode data for JavaScript
        $attrs_json = htmlspecialchars(json_encode($final_atts), ENT_QUOTES, 'UTF-8');
        $content_encoded = htmlspecialchars($content, ENT_QUOTES, 'UTF-8');
        
        return sprintf(
            '<div id="%s" class="dropshipping-shortcode" data-shortcode="%s" data-attrs="%s" data-content="%s">
                <div class="shortcode-loading">Loading %s...</div>
            </div>',
            esc_attr($container_id),
            esc_attr($shortcode_name),
            $attrs_json,
            $content_encoded,
            esc_html($shortcode_name)
        );
    }
    
    // Shortcode callback methods
    public function render_partner_dashboard($atts, $content = '') {
        return $this->render_shortcode('partner_dashboard', $atts, $content);
    }
    
    public function render_partner_products($atts, $content = '') {
        return $this->render_shortcode('partner_products', $atts, $content);
    }
    
    public function render_partner_commissions($atts, $content = '') {
        return $this->render_shortcode('partner_commissions', $atts, $content);
    }
    
    public function render_partner_link_generator($atts, $content = '') {
        return $this->render_shortcode('partner_link_generator', $atts, $content);
    }
    
    public function render_partner_commission_dashboard($atts, $content = '') {
        return $this->render_shortcode('partner_commission_dashboard', $atts, $content);
    }
    
    public function render_partner_payout_requests($atts, $content = '') {
        return $this->render_shortcode('partner_payout_requests', $atts, $content);
    }
    
    // Supplier shortcode callback methods
    public function render_supplier_products($atts, $content = '') {
        return $this->render_shortcode('supplier_products', $atts, $content);
    }
    
    public function render_supplier_product_editor($atts, $content = '') {
        return $this->render_shortcode('supplier_product_editor', $atts, $content);
    }
    
    public function render_supplier_dashboard($atts, $content = '') {
        return $this->render_shortcode('supplier_dashboard', $atts, $content);
    }
    
    // Seller shortcode callback methods
    public function render_seller_dashboard($atts, $content = '') {
        return $this->render_shortcode('seller_dashboard', $atts, $content);
    }
    
    public function render_seller_products($atts, $content = '') {
        return $this->render_shortcode('seller_products', $atts, $content);
    }
    
    public function render_seller_settlement($atts, $content = '') {
        return $this->render_shortcode('seller_settlement', $atts, $content);
    }
    
    public function render_user_dashboard($atts, $content = '') {
        return $this->render_shortcode('user_dashboard', $atts, $content);
    }
    
    public function render_role_verification($atts, $content = '') {
        return $this->render_shortcode('role_verification', $atts, $content);
    }
    
    // Admin shortcode callback methods
    public function render_admin_approval_queue($atts, $content = '') {
        // Check if user is administrator
        if (!current_user_can('manage_options')) {
            return '<div class="alert alert-warning">관리자 권한이 필요합니다.</div>';
        }
        return $this->render_shortcode('admin_approval_queue', $atts, $content);
    }
    
    public function render_admin_platform_stats($atts, $content = '') {
        // Check if user is administrator
        if (!current_user_can('manage_options')) {
            return '<div class="alert alert-warning">관리자 권한이 필요합니다.</div>';
        }
        return $this->render_shortcode('admin_platform_stats', $atts, $content);
    }
    
    /**
     * Add admin menu for shortcode management
     */
    public function add_admin_menu() {
        add_submenu_page(
            'tools.php',
            'Dropshipping Shortcodes',
            'Dropshipping Shortcodes',
            'manage_options',
            'dropshipping-shortcodes',
            [$this, 'admin_page']
        );
    }
    
    /**
     * Admin page for shortcode documentation
     */
    public function admin_page() {
        ?>
        <div class="wrap">
            <h1>Dropshipping Shortcodes</h1>
            <p>Available shortcodes for the dropshipping partner portal:</p>
            
            <div class="shortcode-list">
                <?php foreach ($this->shortcodes as $tag => $config): ?>
                    <div class="shortcode-item" style="border: 1px solid #ccd0d4; padding: 15px; margin: 10px 0; border-radius: 4px;">
                        <h3><code>[<?php echo esc_html($tag); ?>]</code></h3>
                        <p><?php echo esc_html($config['description']); ?></p>
                        
                        <?php if (!empty($config['attributes'])): ?>
                            <h4>Attributes:</h4>
                            <ul>
                                <?php foreach ($config['attributes'] as $attr => $default): ?>
                                    <li><strong><?php echo esc_html($attr); ?>:</strong> Default: <?php echo esc_html($default ?: 'none'); ?></li>
                                <?php endforeach; ?>
                            </ul>
                        <?php endif; ?>
                        
                        <h4>Example:</h4>
                        <code style="background: #f0f0f1; padding: 5px; display: block; margin-top: 5px;">
                            [<?php echo esc_html($tag); ?>
                            <?php if (!empty($config['attributes'])): ?>
                                <?php foreach (array_slice($config['attributes'], 0, 2) as $attr => $default): ?>
                                    <?php echo esc_html($attr); ?>="<?php echo esc_html($default ?: 'value'); ?>"
                                <?php endforeach; ?>
                            <?php endif; ?>]
                        </code>
                    </div>
                <?php endforeach; ?>
            </div>
        </div>
        <?php
    }
    
    /**
     * Add shortcode button to editor
     */
    public function add_shortcode_button() {
        echo '<button type="button" class="button" onclick="toggleDropshippingShortcodes()">
            Add Dropshipping Shortcode
        </button>';
        
        // Add JavaScript for shortcode insertion
        ?>
        <script>
        function toggleDropshippingShortcodes() {
            if (confirm('Open shortcode helper?')) {
                window.open('<?php echo admin_url('tools.php?page=dropshipping-shortcodes'); ?>', '_blank');
            }
        }
        </script>
        <?php
    }
}

// Initialize the shortcodes
new DropshippingShortcodes();

/**
 * Helper function to check if user has partner role
 */
function is_dropshipping_partner($user_id = null) {
    if (!$user_id) {
        $user_id = get_current_user_id();
    }
    
    $user = get_userdata($user_id);
    return $user && in_array('partner', $user->roles);
}

/**
 * Helper function to get partner referral code
 */
function get_partner_referral_code($user_id = null) {
    if (!$user_id) {
        $user_id = get_current_user_id();
    }
    
    return get_user_meta($user_id, 'partner_referral_code', true);
}

/**
 * CSS for shortcode styling
 */
function dropshipping_shortcode_styles() {
    ?>
    <style>
    .dropshipping-shortcode {
        margin: 1em 0;
        clear: both;
    }
    
    .shortcode-loading {
        text-align: center;
        padding: 20px;
        color: #666;
    }
    
    .shortcode-auth-required {
        background: #fff3cd;
        border: 1px solid #ffeaa7;
        padding: 15px;
        border-radius: 4px;
        margin: 10px 0;
    }
    
    .shortcode-auth-required a {
        color: #856404;
        text-decoration: underline;
    }
    
    @media (max-width: 768px) {
        .dropshipping-shortcode {
            margin: 0.5em 0;
        }
    }
    </style>
    <?php
}
add_action('wp_head', 'dropshipping_shortcode_styles');
?>