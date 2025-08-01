<?php
/**
 * CPT/ACF Loop Block - Server Side Render
 * 
 * @package O4O
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Render the CPT/ACF Loop block
 * 
 * @param array $attributes Block attributes
 * @param string $content Block content
 * @return string Rendered block HTML
 */
function render_cpt_acf_loop_block($attributes, $content) {
    // Extract attributes with defaults
    $post_type = isset($attributes['postType']) ? $attributes['postType'] : 'post';
    $posts_per_page = isset($attributes['postsPerPage']) ? intval($attributes['postsPerPage']) : 12;
    $order_by = isset($attributes['orderBy']) ? $attributes['orderBy'] : 'date';
    $order = isset($attributes['order']) ? $attributes['order'] : 'desc';
    $layout_type = isset($attributes['layoutType']) ? $attributes['layoutType'] : 'grid';
    $columns_desktop = isset($attributes['columnsDesktop']) ? intval($attributes['columnsDesktop']) : 3;
    $columns_tablet = isset($attributes['columnsTablet']) ? intval($attributes['columnsTablet']) : 2;
    $columns_mobile = isset($attributes['columnsMobile']) ? intval($attributes['columnsMobile']) : 1;
    $selected_acf_fields = isset($attributes['selectedACFFields']) ? $attributes['selectedACFFields'] : array();
    
    // Phase 3 attributes
    $taxonomy_filters = isset($attributes['taxonomyFilters']) ? $attributes['taxonomyFilters'] : array();
    $acf_conditions = isset($attributes['acfConditions']) ? $attributes['acfConditions'] : array();
    $date_filter = isset($attributes['dateFilter']) ? $attributes['dateFilter'] : array('type' => 'none');
    $pagination_type = isset($attributes['paginationType']) ? $attributes['paginationType'] : 'numbers';
    $enable_search = isset($attributes['enableSearch']) ? $attributes['enableSearch'] : false;
    $search_placeholder = isset($attributes['searchPlaceholder']) ? $attributes['searchPlaceholder'] : __('Search posts...', 'o4o');
    $search_in = isset($attributes['searchIn']) ? $attributes['searchIn'] : array('title', 'content', 'excerpt');
    $real_time_search = isset($attributes['realTimeSearch']) ? $attributes['realTimeSearch'] : true;
    
    // Get current page for pagination
    $paged = get_query_var('paged') ? get_query_var('paged') : 1;
    
    // Handle search query
    $search_query = isset($_GET['o4o_search']) ? sanitize_text_field($_GET['o4o_search']) : '';
    
    // Build query arguments
    $query_args = array(
        'post_type' => $post_type,
        'posts_per_page' => $pagination_type === 'none' ? -1 : $posts_per_page,
        'orderby' => $order_by,
        'order' => $order,
        'post_status' => 'publish',
        'paged' => $paged,
    );
    
    // Add search
    if (!empty($search_query)) {
        $query_args['s'] = $search_query;
    }
    
    // Add taxonomy filters
    if (!empty($taxonomy_filters)) {
        $tax_query = array();
        
        foreach ($taxonomy_filters as $taxonomy => $filter) {
            if (!empty($filter['terms'])) {
                $tax_query[] = array(
                    'taxonomy' => $taxonomy,
                    'field' => 'term_id',
                    'terms' => $filter['terms'],
                    'operator' => isset($filter['operator']) ? $filter['operator'] : 'IN',
                );
            }
        }
        
        if (!empty($tax_query)) {
            if (count($tax_query) > 1) {
                $tax_query['relation'] = 'AND';
            }
            $query_args['tax_query'] = $tax_query;
        }
    }
    
    // Add date filter
    if ($date_filter['type'] !== 'none') {
        $date_query = array();
        
        if ($date_filter['type'] === 'relative' && !empty($date_filter['relative'])) {
            $relative = $date_filter['relative'];
            
            switch ($relative) {
                case 'today':
                    $date_query[] = array(
                        'after' => 'today',
                        'inclusive' => true,
                    );
                    break;
                case 'last_7_days':
                    $date_query[] = array(
                        'after' => '7 days ago',
                        'inclusive' => true,
                    );
                    break;
                case 'last_30_days':
                    $date_query[] = array(
                        'after' => '30 days ago',
                        'inclusive' => true,
                    );
                    break;
                case 'this_month':
                    $date_query[] = array(
                        'year' => date('Y'),
                        'month' => date('n'),
                    );
                    break;
                case 'this_year':
                    $date_query[] = array(
                        'year' => date('Y'),
                    );
                    break;
            }
        } elseif ($date_filter['type'] === 'absolute') {
            if (!empty($date_filter['startDate'])) {
                $date_query[] = array(
                    'after' => $date_filter['startDate'],
                    'inclusive' => true,
                );
            }
            if (!empty($date_filter['endDate'])) {
                $date_query[] = array(
                    'before' => $date_filter['endDate'],
                    'inclusive' => true,
                );
            }
        }
        
        if (!empty($date_query)) {
            $query_args['date_query'] = $date_query;
        }
    }
    
    // Add ACF meta query
    if (!empty($acf_conditions) && function_exists('get_field_object')) {
        $meta_query = array();
        
        foreach ($acf_conditions as $group) {
            if (!empty($group['conditions'])) {
                $group_query = array();
                
                foreach ($group['conditions'] as $condition) {
                    if (!empty($condition['field']) && !empty($condition['compare'])) {
                        $group_query[] = array(
                            'key' => $condition['field'],
                            'value' => isset($condition['value']) ? $condition['value'] : '',
                            'compare' => $condition['compare'],
                            'type' => isset($condition['type']) ? $condition['type'] : 'CHAR',
                        );
                    }
                }
                
                if (!empty($group_query)) {
                    if (count($group_query) > 1) {
                        $group_query['relation'] = isset($group['relation']) ? $group['relation'] : 'AND';
                    }
                    $meta_query[] = $group_query;
                }
            }
        }
        
        if (!empty($meta_query)) {
            if (count($meta_query) > 1) {
                $meta_query['relation'] = 'OR';
            }
            $query_args['meta_query'] = $meta_query;
        }
    }
    
    // Create query
    $query = new WP_Query($query_args);
    
    // Generate unique block ID
    $block_id = 'o4o-cpt-acf-loop-' . wp_unique_id();
    
    // Start output buffering
    ob_start();
    
    // Build wrapper classes
    $wrapper_classes = array(
        'wp-block-o4o-cpt-acf-loop',
        'o4o-cpt-acf-loop',
        'o4o-cpt-acf-loop--' . $layout_type,
    );
    
    if (isset($attributes['align'])) {
        $wrapper_classes[] = 'align' . $attributes['align'];
    }
    
    ?>
    <div id="<?php echo esc_attr($block_id); ?>" class="<?php echo esc_attr(implode(' ', $wrapper_classes)); ?>" data-block-attributes="<?php echo esc_attr(json_encode($attributes)); ?>">
        <?php if ($enable_search) : ?>
            <div class="o4o-cpt-acf-loop__search">
                <form class="o4o-cpt-acf-loop__search-form" method="get" action="">
                    <div class="o4o-cpt-acf-loop__search-input-wrapper">
                        <input 
                            type="search" 
                            name="o4o_search" 
                            class="o4o-cpt-acf-loop__search-input" 
                            placeholder="<?php echo esc_attr($search_placeholder); ?>"
                            value="<?php echo esc_attr($search_query); ?>"
                            <?php echo $real_time_search ? 'data-realtime="true"' : ''; ?>
                        />
                        <?php if (!$real_time_search) : ?>
                            <button type="submit" class="o4o-cpt-acf-loop__search-button">
                                <span class="dashicons dashicons-search"></span>
                                <span class="screen-reader-text"><?php _e('Search', 'o4o'); ?></span>
                            </button>
                        <?php endif; ?>
                    </div>
                </form>
            </div>
        <?php endif; ?>
        
        <?php if ($query->have_posts()) : ?>
            <div class="o4o-cpt-acf-loop__items o4o-cpt-acf-loop__items--<?php echo esc_attr($layout_type); ?> <?php echo $layout_type === 'grid' ? 'o4o-cpt-acf-loop__items--cols-' . $columns_desktop : ''; ?>">
                <?php 
                $item_index = 0;
                while ($query->have_posts()) : 
                    $query->the_post(); 
                    $item_classes = array('o4o-cpt-acf-loop__item', 'o4o-cpt-acf-loop__item--' . $layout_type);
                    
                    if ($layout_type === 'magazine' && $item_index === 0) {
                        $item_classes[] = 'o4o-cpt-acf-loop__item--featured';
                    }
                ?>
                    <article id="post-<?php the_ID(); ?>" <?php post_class($item_classes); ?>>
                        <?php 
                        // Render based on template type
                        switch ($layout_type) {
                            case 'list':
                                render_list_template($selected_acf_fields);
                                break;
                            case 'minimal':
                                render_minimal_template($selected_acf_fields);
                                break;
                            case 'magazine':
                                render_magazine_template($selected_acf_fields, $item_index === 0);
                                break;
                            case 'card':
                            default:
                                render_card_template($selected_acf_fields);
                                break;
                        }
                        ?>
                    </article>
                <?php 
                    $item_index++;
                endwhile; 
                ?>
            </div>
            
            <?php 
            // Render pagination
            if ($pagination_type !== 'none' && $query->max_num_pages > 1) {
                render_pagination($pagination_type, $paged, $query->max_num_pages, $query->found_posts, $posts_per_page);
            }
            ?>
        <?php else : ?>
            <div class="o4o-cpt-acf-loop--empty">
                <p><?php _e('No posts found.', 'o4o'); ?></p>
            </div>
        <?php endif; ?>
    </div>
    
    <?php if ($enable_search && $real_time_search) : ?>
    <script>
    (function() {
        const blockEl = document.getElementById('<?php echo esc_js($block_id); ?>');
        const searchInput = blockEl.querySelector('.o4o-cpt-acf-loop__search-input');
        
        if (searchInput) {
            let debounceTimer;
            
            searchInput.addEventListener('input', function(e) {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(function() {
                    const url = new URL(window.location);
                    if (e.target.value) {
                        url.searchParams.set('o4o_search', e.target.value);
                    } else {
                        url.searchParams.delete('o4o_search');
                    }
                    window.location.href = url.toString();
                }, 500);
            });
        }
    })();
    </script>
    <?php endif; ?>
    
    <?php if ($pagination_type === 'infinite') : ?>
    <script>
    (function() {
        const blockEl = document.getElementById('<?php echo esc_js($block_id); ?>');
        const loader = blockEl.querySelector('.o4o-cpt-acf-loop__pagination-loader');
        let isLoading = false;
        let currentPage = <?php echo $paged; ?>;
        const maxPages = <?php echo $query->max_num_pages; ?>;
        
        if (loader && currentPage < maxPages) {
            const observer = new IntersectionObserver(function(entries) {
                if (entries[0].isIntersecting && !isLoading) {
                    isLoading = true;
                    currentPage++;
                    
                    const url = new URL(window.location);
                    url.searchParams.set('paged', currentPage);
                    
                    fetch(url.toString() + '&o4o_ajax=1')
                        .then(response => response.text())
                        .then(html => {
                            const parser = new DOMParser();
                            const doc = parser.parseFromString(html, 'text/html');
                            const newItems = doc.querySelectorAll('.o4o-cpt-acf-loop__item');
                            const itemsContainer = blockEl.querySelector('.o4o-cpt-acf-loop__items');
                            
                            newItems.forEach(item => {
                                itemsContainer.appendChild(item.cloneNode(true));
                            });
                            
                            isLoading = false;
                            
                            if (currentPage >= maxPages) {
                                observer.disconnect();
                                loader.innerHTML = '<p class="o4o-cpt-acf-loop__pagination-end"><?php _e('No more posts to load.', 'o4o'); ?></p>';
                            }
                        });
                }
            });
            
            observer.observe(loader);
        }
    })();
    </script>
    <?php endif; ?>
    
    <?php
    // Reset post data
    wp_reset_postdata();
    
    // Return output
    return ob_get_clean();
}

/**
 * Render card template
 */
function render_card_template($selected_acf_fields) {
    ?>
    <?php if (has_post_thumbnail()) : ?>
        <div class="o4o-cpt-acf-loop__featured-image">
            <a href="<?php the_permalink(); ?>">
                <?php the_post_thumbnail('medium'); ?>
            </a>
        </div>
    <?php endif; ?>
    
    <div class="o4o-cpt-acf-loop__content">
        <h3 class="o4o-cpt-acf-loop__title">
            <a href="<?php the_permalink(); ?>">
                <?php the_title(); ?>
            </a>
        </h3>
        
        <?php if (has_excerpt()) : ?>
            <div class="o4o-cpt-acf-loop__excerpt">
                <?php the_excerpt(); ?>
            </div>
        <?php endif; ?>
        
        <?php render_acf_fields($selected_acf_fields); ?>
        
        <div class="o4o-cpt-acf-loop__meta">
            <span class="o4o-cpt-acf-loop__meta-item">
                <time datetime="<?php echo esc_attr(get_the_date('c')); ?>">
                    <?php echo get_the_date(); ?>
                </time>
            </span>
            
            <?php 
            $categories = get_the_category();
            if ($categories) : 
            ?>
                <span class="o4o-cpt-acf-loop__meta-item">
                    <?php echo esc_html($categories[0]->name); ?>
                </span>
            <?php endif; ?>
        </div>
    </div>
    <?php
}

/**
 * Render list template
 */
function render_list_template($selected_acf_fields) {
    ?>
    <div class="o4o-cpt-acf-loop__item-wrapper">
        <?php if (has_post_thumbnail()) : ?>
            <div class="o4o-cpt-acf-loop__featured-image o4o-cpt-acf-loop__featured-image--thumbnail">
                <a href="<?php the_permalink(); ?>">
                    <?php the_post_thumbnail('thumbnail'); ?>
                </a>
            </div>
        <?php endif; ?>
        
        <div class="o4o-cpt-acf-loop__content">
            <div class="o4o-cpt-acf-loop__meta o4o-cpt-acf-loop__meta--header">
                <span class="o4o-cpt-acf-loop__meta-item o4o-cpt-acf-loop__meta-item--author">
                    <?php the_author(); ?>
                </span>
                <span class="o4o-cpt-acf-loop__meta-item">
                    <time datetime="<?php echo esc_attr(get_the_date('c')); ?>">
                        <?php echo get_the_date(); ?>
                    </time>
                </span>
            </div>
            
            <h3 class="o4o-cpt-acf-loop__title">
                <a href="<?php the_permalink(); ?>">
                    <?php the_title(); ?>
                </a>
            </h3>
            
            <?php if (has_excerpt()) : ?>
                <div class="o4o-cpt-acf-loop__excerpt">
                    <?php the_excerpt(); ?>
                </div>
            <?php endif; ?>
            
            <?php render_acf_fields($selected_acf_fields, true); ?>
        </div>
    </div>
    <?php
}

/**
 * Render minimal template
 */
function render_minimal_template($selected_acf_fields) {
    ?>
    <h3 class="o4o-cpt-acf-loop__title">
        <a href="<?php the_permalink(); ?>">
            <?php the_title(); ?>
        </a>
    </h3>
    
    <div class="o4o-cpt-acf-loop__meta o4o-cpt-acf-loop__meta--minimal">
        <time datetime="<?php echo esc_attr(get_the_date('c')); ?>">
            <?php echo get_the_date(); ?>
        </time>
    </div>
    
    <?php render_acf_fields($selected_acf_fields, true); ?>
    <?php
}

/**
 * Render magazine template
 */
function render_magazine_template($selected_acf_fields, $is_first = false) {
    $categories = get_the_category();
    ?>
    
    <?php if ($categories) : ?>
        <div class="o4o-cpt-acf-loop__category-badge">
            <?php echo esc_html($categories[0]->name); ?>
        </div>
    <?php endif; ?>
    
    <?php if (has_post_thumbnail()) : ?>
        <div class="o4o-cpt-acf-loop__featured-image">
            <a href="<?php the_permalink(); ?>">
                <?php the_post_thumbnail($is_first ? 'large' : 'medium'); ?>
            </a>
        </div>
    <?php endif; ?>
    
    <div class="o4o-cpt-acf-loop__content">
        <h3 class="o4o-cpt-acf-loop__title">
            <a href="<?php the_permalink(); ?>">
                <?php the_title(); ?>
            </a>
        </h3>
        
        <div class="o4o-cpt-acf-loop__meta">
            <span class="o4o-cpt-acf-loop__meta-item o4o-cpt-acf-loop__meta-item--author">
                <?php the_author(); ?>
            </span>
            <span class="o4o-cpt-acf-loop__meta-item">
                <time datetime="<?php echo esc_attr(get_the_date('c')); ?>">
                    <?php echo get_the_date(); ?>
                </time>
            </span>
        </div>
        
        <?php if ($is_first && has_excerpt()) : ?>
            <div class="o4o-cpt-acf-loop__excerpt">
                <?php the_excerpt(); ?>
            </div>
        <?php endif; ?>
        
        <?php render_acf_fields($selected_acf_fields, !$is_first); ?>
    </div>
    <?php
}

/**
 * Render ACF fields
 */
function render_acf_fields($selected_fields, $inline = false) {
    if (!function_exists('get_field_object') || empty($selected_fields)) {
        return;
    }
    
    $has_visible_fields = false;
    $fields_html = '';
    
    foreach ($selected_fields as $field_config) {
        if (!isset($field_config['visible']) || !$field_config['visible']) {
            continue;
        }
        
        $field_key = $field_config['key'];
        $field_object = get_field_object($field_key);
        
        if (!$field_object || empty($field_object['value'])) {
            continue;
        }
        
        $has_visible_fields = true;
        $label = !empty($field_config['customLabel']) ? $field_config['customLabel'] : $field_object['label'];
        
        ob_start();
        ?>
        <div class="o4o-acf-field o4o-acf-field--<?php echo esc_attr($field_object['type']); ?>">
            <div class="o4o-acf-field__label"><?php echo esc_html($label); ?></div>
            <div class="o4o-acf-field__value">
                <?php render_acf_field_value($field_object); ?>
            </div>
        </div>
        <?php
        $fields_html .= ob_get_clean();
    }
    
    if ($has_visible_fields) {
        echo '<div class="o4o-cpt-acf-loop__acf-fields' . ($inline ? ' o4o-cpt-acf-loop__acf-fields--inline' : '') . '">';
        echo $fields_html;
        echo '</div>';
    }
}

/**
 * Render individual ACF field value based on type
 */
function render_acf_field_value($field) {
    $value = $field['value'];
    $type = $field['type'];
    
    switch ($type) {
        case 'image':
            if (is_array($value)) {
                echo '<img src="' . esc_url($value['sizes']['medium']) . '" alt="' . esc_attr($value['alt']) . '" class="o4o-acf-field__image" />';
            } elseif (is_numeric($value)) {
                echo wp_get_attachment_image($value, 'medium', false, array('class' => 'o4o-acf-field__image'));
            }
            break;
            
        case 'gallery':
            if (is_array($value)) {
                echo '<div class="o4o-acf-field__gallery">';
                foreach ($value as $image) {
                    if (is_array($image)) {
                        echo '<img src="' . esc_url($image['sizes']['thumbnail']) . '" alt="' . esc_attr($image['alt']) . '" />';
                    } elseif (is_numeric($image)) {
                        echo wp_get_attachment_image($image, 'thumbnail');
                    }
                }
                echo '</div>';
            }
            break;
            
        case 'file':
            if (is_array($value)) {
                echo '<a href="' . esc_url($value['url']) . '" class="o4o-acf-field__file-link" download>';
                echo '<span class="dashicons dashicons-download"></span> ';
                echo esc_html($value['title'] ?: $value['filename']);
                echo '</a>';
            }
            break;
            
        case 'url':
            echo '<a href="' . esc_url($value) . '" class="o4o-acf-field__link" target="_blank" rel="noopener">';
            echo esc_html($value);
            echo '</a>';
            break;
            
        case 'email':
            echo '<a href="mailto:' . esc_attr($value) . '" class="o4o-acf-field__link">';
            echo esc_html($value);
            echo '</a>';
            break;
            
        case 'true_false':
            echo '<span class="o4o-acf-field__boolean o4o-acf-field__boolean--' . ($value ? 'true' : 'false') . '">';
            echo $value ? __('Yes', 'o4o') : __('No', 'o4o');
            echo '</span>';
            break;
            
        case 'color_picker':
            echo '<span class="o4o-acf-field__color-swatch" style="background-color: ' . esc_attr($value) . ';"></span>';
            echo '<span class="o4o-acf-field__color-value">' . esc_html($value) . '</span>';
            break;
            
        case 'select':
        case 'radio':
            if (is_array($value)) {
                echo esc_html(implode(', ', $value));
            } else {
                // Get the label from choices if available
                if (isset($field['choices'][$value])) {
                    echo esc_html($field['choices'][$value]);
                } else {
                    echo esc_html($value);
                }
            }
            break;
            
        case 'checkbox':
            if (is_array($value)) {
                echo '<ul class="o4o-acf-field__checkbox-list">';
                foreach ($value as $item) {
                    echo '<li>';
                    if (isset($field['choices'][$item])) {
                        echo esc_html($field['choices'][$item]);
                    } else {
                        echo esc_html($item);
                    }
                    echo '</li>';
                }
                echo '</ul>';
            }
            break;
            
        case 'relationship':
        case 'post_object':
            if (is_array($value)) {
                echo '<ul class="o4o-acf-field__relationship-list">';
                foreach ($value as $post) {
                    if (is_object($post)) {
                        echo '<li><a href="' . get_permalink($post->ID) . '">' . esc_html($post->post_title) . '</a></li>';
                    }
                }
                echo '</ul>';
            } elseif (is_object($value)) {
                echo '<a href="' . get_permalink($value->ID) . '">' . esc_html($value->post_title) . '</a>';
            }
            break;
            
        case 'user':
            if (is_array($value)) {
                $users = array();
                foreach ($value as $user) {
                    if (is_object($user)) {
                        $users[] = $user->display_name;
                    }
                }
                echo esc_html(implode(', ', $users));
            } elseif (is_object($value)) {
                echo esc_html($value->display_name);
            }
            break;
            
        case 'date_picker':
        case 'date_time_picker':
            $format = $type === 'date_time_picker' ? 'F j, Y g:i a' : 'F j, Y';
            echo esc_html(date_i18n($format, strtotime($value)));
            break;
            
        case 'wysiwyg':
            echo wp_kses_post($value);
            break;
            
        case 'oembed':
            echo wp_oembed_get($value);
            break;
            
        default:
            // For text, textarea, number, and other simple types
            if (is_array($value)) {
                echo esc_html(implode(', ', $value));
            } else {
                echo nl2br(esc_html($value));
            }
            break;
    }
}

/**
 * Render pagination
 */
function render_pagination($type, $current_page, $total_pages, $total_items, $items_per_page) {
    ?>
    <nav class="o4o-cpt-acf-loop__pagination o4o-cpt-acf-loop__pagination--<?php echo esc_attr($type); ?>">
        <?php
        switch ($type) {
            case 'numbers':
                $start_item = ($current_page - 1) * $items_per_page + 1;
                $end_item = min($current_page * $items_per_page, $total_items);
                ?>
                <div class="o4o-cpt-acf-loop__pagination-info">
                    <?php printf(__('Showing %d-%d of %d posts', 'o4o'), $start_item, $end_item, $total_items); ?>
                </div>
                
                <div class="o4o-cpt-acf-loop__pagination-controls">
                    <?php
                    $args = array(
                        'base' => str_replace(999999999, '%#%', esc_url(get_pagenum_link(999999999))),
                        'format' => '?paged=%#%',
                        'current' => $current_page,
                        'total' => $total_pages,
                        'prev_text' => __('Previous', 'o4o'),
                        'next_text' => __('Next', 'o4o'),
                        'type' => 'array',
                        'mid_size' => 2,
                    );
                    
                    $pages = paginate_links($args);
                    
                    if (is_array($pages)) {
                        echo '<div class="o4o-cpt-acf-loop__pagination-numbers">';
                        foreach ($pages as $page) {
                            echo str_replace('page-numbers', 'o4o-cpt-acf-loop__pagination-number', $page);
                        }
                        echo '</div>';
                    }
                    ?>
                </div>
                <?php
                break;
                
            case 'loadmore':
                if ($current_page < $total_pages) {
                    ?>
                    <button 
                        class="o4o-cpt-acf-loop__loadmore-button button" 
                        data-page="<?php echo $current_page + 1; ?>"
                        data-max-pages="<?php echo $total_pages; ?>"
                    >
                        <?php _e('Load More Posts', 'o4o'); ?>
                    </button>
                    <?php
                }
                break;
                
            case 'infinite':
                if ($current_page < $total_pages) {
                    ?>
                    <div class="o4o-cpt-acf-loop__pagination-loader">
                        <span class="spinner is-active"></span>
                        <span><?php _e('Loading more posts...', 'o4o'); ?></span>
                    </div>
                    <?php
                } else {
                    ?>
                    <p class="o4o-cpt-acf-loop__pagination-end">
                        <?php _e('No more posts to load.', 'o4o'); ?>
                    </p>
                    <?php
                }
                break;
        }
        ?>
    </nav>
    <?php
}

// Register the render callback
function register_cpt_acf_loop_render_callback() {
    if (function_exists('register_block_type')) {
        register_block_type(__DIR__ . '/block.json', array(
            'render_callback' => 'render_cpt_acf_loop_block',
        ));
    }
}
add_action('init', 'register_cpt_acf_loop_render_callback');

// Handle AJAX requests for infinite scroll
function handle_cpt_acf_loop_ajax() {
    if (isset($_GET['o4o_ajax']) && $_GET['o4o_ajax'] === '1') {
        // Remove everything except our block output
        ob_start();
        
        // Let WordPress handle the query
        // The block will be rendered as part of the content
        
        // Get the content
        $content = ob_get_clean();
        
        // Extract just the items
        if (preg_match('/<div class="o4o-cpt-acf-loop__items[^>]*>(.*?)<\/div>/s', $content, $matches)) {
            echo $matches[1];
        }
        
        exit;
    }
}
add_action('template_redirect', 'handle_cpt_acf_loop_ajax', 5);