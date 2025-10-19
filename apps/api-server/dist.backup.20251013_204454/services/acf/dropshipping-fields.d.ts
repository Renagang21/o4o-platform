export declare const DROPSHIPPING_ACF_GROUPS: ({
    name: string;
    title: string;
    position: string;
    style: string;
    label_placement: string;
    instruction_placement: string;
    location: {
        param: string;
        operator: string;
        value: string;
    }[];
    fields: ({
        key: string;
        label: string;
        name: string;
        type: string;
        required: boolean;
        default_value: number;
        placeholder: string;
        prepend: string;
        min: number;
        step: number;
        instructions: string;
        readonly?: undefined;
        append?: undefined;
        wrapper?: undefined;
        max?: undefined;
        message?: undefined;
    } | {
        key: string;
        label: string;
        name: string;
        type: string;
        readonly: boolean;
        default_value: string;
        append: string;
        instructions: string;
        wrapper: {
            class: string;
        };
        required?: undefined;
        placeholder?: undefined;
        prepend?: undefined;
        min?: undefined;
        step?: undefined;
        max?: undefined;
        message?: undefined;
    } | {
        key: string;
        label: string;
        name: string;
        type: string;
        required: boolean;
        default_value: number;
        min: number;
        max: number;
        step: number;
        append: string;
        instructions: string;
        placeholder?: undefined;
        prepend?: undefined;
        readonly?: undefined;
        wrapper?: undefined;
        message?: undefined;
    } | {
        key: string;
        label: string;
        name: string;
        type: string;
        message: string;
        wrapper: {
            class: string;
        };
        required?: undefined;
        default_value?: undefined;
        placeholder?: undefined;
        prepend?: undefined;
        min?: undefined;
        step?: undefined;
        instructions?: undefined;
        readonly?: undefined;
        append?: undefined;
        max?: undefined;
    })[];
} | {
    name: string;
    title: string;
    position: string;
    style: string;
    location: {
        param: string;
        operator: string;
        value: string;
    }[];
    fields: ({
        key: string;
        label: string;
        name: string;
        type: string;
        required: boolean;
        post_type: string[];
        filters: string[];
        max: number;
        return_format: string;
        instructions: string;
        placeholder?: undefined;
    } | {
        key: string;
        label: string;
        name: string;
        type: string;
        placeholder: string;
        instructions: string;
        required?: undefined;
        post_type?: undefined;
        filters?: undefined;
        max?: undefined;
        return_format?: undefined;
    })[];
    label_placement?: undefined;
    instruction_placement?: undefined;
} | {
    name: string;
    title: string;
    position: string;
    style: string;
    location: {
        param: string;
        operator: string;
        value: string;
    }[];
    fields: ({
        key: string;
        label: string;
        name: string;
        type: string;
        default_value: number;
        min: number;
        max: number;
        append: string;
        wrapper: {
            width: string;
        };
        prepend?: undefined;
        step?: undefined;
        instructions?: undefined;
    } | {
        key: string;
        label: string;
        name: string;
        type: string;
        default_value: number;
        min: number;
        prepend: string;
        step: number;
        instructions: string;
        max?: undefined;
        append?: undefined;
        wrapper?: undefined;
    })[];
    label_placement?: undefined;
    instruction_placement?: undefined;
} | {
    name: string;
    title: string;
    position: string;
    style: string;
    location: {
        param: string;
        operator: string;
        value: string;
    }[];
    fields: ({
        key: string;
        label: string;
        name: string;
        type: string;
        required: boolean;
        placeholder?: undefined;
        instructions?: undefined;
        message?: undefined;
        wrapper?: undefined;
    } | {
        key: string;
        label: string;
        name: string;
        type: string;
        placeholder: string;
        required?: undefined;
        instructions?: undefined;
        message?: undefined;
        wrapper?: undefined;
    } | {
        key: string;
        label: string;
        name: string;
        type: string;
        instructions: string;
        required?: undefined;
        placeholder?: undefined;
        message?: undefined;
        wrapper?: undefined;
    } | {
        key: string;
        label: string;
        name: string;
        type: string;
        message: string;
        wrapper: {
            class: string;
        };
        required?: undefined;
        placeholder?: undefined;
        instructions?: undefined;
    })[];
    label_placement?: undefined;
    instruction_placement?: undefined;
} | {
    name: string;
    title: string;
    position: string;
    style: string;
    location: {
        param: string;
        operator: string;
        value: string;
    }[];
    fields: ({
        key: string;
        label: string;
        name: string;
        type: string;
        required: boolean;
        default_value: number;
        placeholder: string;
        prepend: string;
        min: number;
        step: number;
        instructions: string;
        conditional_logic: {
            field: string;
            operator: string;
            value: string;
        }[][];
        max?: undefined;
        append?: undefined;
        message?: undefined;
        wrapper?: undefined;
    } | {
        key: string;
        label: string;
        name: string;
        type: string;
        required: boolean;
        default_value: number;
        min: number;
        max: number;
        step: number;
        append: string;
        instructions: string;
        conditional_logic: {
            field: string;
            operator: string;
            value: string;
        }[][];
        placeholder?: undefined;
        prepend?: undefined;
        message?: undefined;
        wrapper?: undefined;
    } | {
        key: string;
        label: string;
        name: string;
        type: string;
        message: string;
        wrapper: {
            class: string;
        };
        conditional_logic: {
            field: string;
            operator: string;
            value: string;
        }[][];
        required?: undefined;
        default_value?: undefined;
        placeholder?: undefined;
        prepend?: undefined;
        min?: undefined;
        step?: undefined;
        instructions?: undefined;
        max?: undefined;
        append?: undefined;
    })[];
    label_placement?: undefined;
    instruction_placement?: undefined;
} | {
    name: string;
    title: string;
    position: string;
    style: string;
    location: {
        param: string;
        operator: string;
        value: string;
    }[];
    fields: ({
        key: string;
        label: string;
        name: string;
        type: string;
        choices: {
            individual: string;
            business: string;
            bronze?: undefined;
            silver?: undefined;
            gold?: undefined;
            platinum?: undefined;
        };
        default_value: string;
        required: boolean;
        readonly?: undefined;
        instructions?: undefined;
        min?: undefined;
        max?: undefined;
        append?: undefined;
    } | {
        key: string;
        label: string;
        name: string;
        type: string;
        choices: {
            bronze: string;
            silver: string;
            gold: string;
            platinum: string;
            individual?: undefined;
            business?: undefined;
        };
        default_value: string;
        required: boolean;
        readonly?: undefined;
        instructions?: undefined;
        min?: undefined;
        max?: undefined;
        append?: undefined;
    } | {
        key: string;
        label: string;
        name: string;
        type: string;
        readonly: boolean;
        instructions: string;
        choices?: undefined;
        default_value?: undefined;
        required?: undefined;
        min?: undefined;
        max?: undefined;
        append?: undefined;
    } | {
        key: string;
        label: string;
        name: string;
        type: string;
        default_value: number;
        min: number;
        max: number;
        append: string;
        choices?: undefined;
        required?: undefined;
        readonly?: undefined;
        instructions?: undefined;
    })[];
    label_placement?: undefined;
    instruction_placement?: undefined;
} | {
    name: string;
    title: string;
    position: string;
    style: string;
    location: {
        param: string;
        operator: string;
        value: string;
    }[];
    fields: ({
        key: string;
        label: string;
        name: string;
        type: string;
        post_type: string[];
        filters: string[];
        max: number;
        return_format: string;
        required?: undefined;
        min?: undefined;
        append?: undefined;
        choices?: undefined;
        layout?: undefined;
        default_value?: undefined;
        prepend?: undefined;
        instructions?: undefined;
        display_format?: undefined;
    } | {
        key: string;
        label: string;
        name: string;
        type: string;
        required: boolean;
        min: number;
        max: number;
        append: string;
        post_type?: undefined;
        filters?: undefined;
        return_format?: undefined;
        choices?: undefined;
        layout?: undefined;
        default_value?: undefined;
        prepend?: undefined;
        instructions?: undefined;
        display_format?: undefined;
    } | {
        key: string;
        label: string;
        name: string;
        type: string;
        choices: {
            bronze: string;
            silver: string;
            gold: string;
            platinum: string;
        };
        layout: string;
        post_type?: undefined;
        filters?: undefined;
        max?: undefined;
        return_format?: undefined;
        required?: undefined;
        min?: undefined;
        append?: undefined;
        default_value?: undefined;
        prepend?: undefined;
        instructions?: undefined;
        display_format?: undefined;
    } | {
        key: string;
        label: string;
        name: string;
        type: string;
        default_value: number;
        min: number;
        prepend: string;
        instructions: string;
        post_type?: undefined;
        filters?: undefined;
        max?: undefined;
        return_format?: undefined;
        required?: undefined;
        append?: undefined;
        choices?: undefined;
        layout?: undefined;
        display_format?: undefined;
    } | {
        key: string;
        label: string;
        name: string;
        type: string;
        required: boolean;
        display_format: string;
        return_format: string;
        post_type?: undefined;
        filters?: undefined;
        max?: undefined;
        min?: undefined;
        append?: undefined;
        choices?: undefined;
        layout?: undefined;
        default_value?: undefined;
        prepend?: undefined;
        instructions?: undefined;
    } | {
        key: string;
        label: string;
        name: string;
        type: string;
        display_format: string;
        return_format: string;
        instructions: string;
        post_type?: undefined;
        filters?: undefined;
        max?: undefined;
        required?: undefined;
        min?: undefined;
        append?: undefined;
        choices?: undefined;
        layout?: undefined;
        default_value?: undefined;
        prepend?: undefined;
    })[];
    label_placement?: undefined;
    instruction_placement?: undefined;
} | {
    name: string;
    title: string;
    position: string;
    style: string;
    location: {
        param: string;
        operator: string;
        value: string;
    }[];
    fields: ({
        key: string;
        label: string;
        name: string;
        type: string;
        required: boolean;
        default_value: number;
        placeholder: string;
        prepend: string;
        min: number;
        step: number;
        instructions: string;
        conditional_logic: {
            field: string;
            operator: string;
            value: string;
        }[][];
        readonly?: undefined;
        append?: undefined;
        wrapper?: undefined;
        message?: undefined;
    } | {
        key: string;
        label: string;
        name: string;
        type: string;
        readonly: boolean;
        default_value: string;
        append: string;
        instructions: string;
        wrapper: {
            class: string;
        };
        conditional_logic: {
            field: string;
            operator: string;
            value: string;
        }[][];
        required?: undefined;
        placeholder?: undefined;
        prepend?: undefined;
        min?: undefined;
        step?: undefined;
        message?: undefined;
    } | {
        key: string;
        label: string;
        name: string;
        type: string;
        readonly: boolean;
        default_value: string;
        instructions: string;
        wrapper: {
            class: string;
        };
        conditional_logic: {
            field: string;
            operator: string;
            value: string;
        }[][];
        required?: undefined;
        placeholder?: undefined;
        prepend?: undefined;
        min?: undefined;
        step?: undefined;
        append?: undefined;
        message?: undefined;
    } | {
        key: string;
        label: string;
        name: string;
        type: string;
        message: string;
        wrapper: {
            class: string;
        };
        conditional_logic: {
            field: string;
            operator: string;
            value: string;
        }[][];
        required?: undefined;
        default_value?: undefined;
        placeholder?: undefined;
        prepend?: undefined;
        min?: undefined;
        step?: undefined;
        instructions?: undefined;
        readonly?: undefined;
        append?: undefined;
    })[];
    label_placement?: undefined;
    instruction_placement?: undefined;
})[];
export declare function registerDropshippingACFFields(): Promise<void>;
export declare const PRICING_CALCULATION_SCRIPT = "\n<script>\n(function($) {\n  'use strict';\n  \n  // Calculate MSRP-based margin for suppliers (\uACF5\uAE09\uC790\uC6A9)\n  function calculateMSRPMargin() {\n    var costPrice = parseFloat($('#acf-field_cost_price').val()) || 0;\n    var msrp = parseFloat($('#acf-field_msrp').val()) || 0;\n    \n    var marginRate = 0;\n    if (msrp > 0) {\n      marginRate = ((msrp - costPrice) / msrp * 100).toFixed(2);\n    }\n    \n    $('#acf-field_margin_rate').val(marginRate);\n    \n    // Update display with color coding (\uCC38\uACE0\uC6A9)\n    var $display = $('.acf-margin-rate-display .acf-input');\n    if ($display.length) {\n      $display.find('input').val(marginRate);\n      \n      // Color code based on margin (\uCC38\uACE0\uC6A9)\n      if (marginRate < 10) {\n        $display.css('background-color', '#fee');\n      } else if (marginRate < 20) {\n        $display.css('background-color', '#ffe');\n      } else {\n        $display.css('background-color', '#efe');\n      }\n    }\n  }\n  \n  // Calculate seller profit margin (\uD310\uB9E4\uC790\uC6A9)\n  function calculateSellerProfit() {\n    var costPrice = parseFloat($('#acf-field_cost_price').val()) || 0;\n    var sellerPrice = parseFloat($('#acf-field_seller_final_price').val()) || 0;\n    var msrp = parseFloat($('#acf-field_msrp').val()) || 0;\n    \n    // Calculate seller profit margin\n    var profitMargin = 0;\n    if (sellerPrice > 0) {\n      profitMargin = ((sellerPrice - costPrice) / sellerPrice * 100).toFixed(2);\n    }\n    \n    $('#acf-field_seller_profit_margin').val(profitMargin);\n    \n    // Update profit margin display\n    var $profitDisplay = $('.seller-profit-margin-display .acf-input');\n    if ($profitDisplay.length) {\n      $profitDisplay.find('input').val(profitMargin);\n      \n      // Color coding for profit health\n      if (profitMargin < 5) {\n        $profitDisplay.css('background-color', '#ffebee'); // Low profit\n      } else if (profitMargin < 15) {\n        $profitDisplay.css('background-color', '#fff3e0'); // Medium profit\n      } else {\n        $profitDisplay.css('background-color', '#e8f5e8'); // Good profit\n      }\n    }\n    \n    // Update MSRP comparison\n    var comparison = 'MSRP \uCC38\uACE0: ' + msrp.toLocaleString() + '\uC6D0';\n    if (sellerPrice > 0 && msrp > 0) {\n      var diff = ((sellerPrice - msrp) / msrp * 100).toFixed(1);\n      if (diff > 0) {\n        comparison += ' (+' + diff + '%)';\n      } else if (diff < 0) {\n        comparison += ' (' + diff + '%)';\n      } else {\n        comparison += ' (\uB3D9\uC77C)';\n      }\n    }\n    \n    $('#acf-field_msrp_comparison').val(comparison);\n    \n    // Update MSRP comparison display\n    var $msrpDisplay = $('.msrp-reference-display .acf-input');\n    if ($msrpDisplay.length) {\n      $msrpDisplay.find('input').val(comparison);\n    }\n  }\n  \n  // Add enhanced legal compliance notices\n  function addLegalNotices() {\n    // MSRP legal notice for suppliers\n    if (!$('.legal-margin-notice').length && $('#acf-field_margin_rate').length) {\n      $('#acf-field_margin_rate').closest('.acf-field').after(\n        '<div class=\"legal-margin-notice\" style=\"background: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; margin: 5px 0; border-radius: 4px; font-size: 12px;\">' +\n        '<strong>\u26A0\uFE0F \uBC95\uB960 \uC900\uC218 \uC548\uB0B4:</strong> MSRP\uB294 \uAD8C\uC7A5 \uAC00\uACA9\uC774\uBA70, \uC2E4\uC81C \uD310\uB9E4\uAC00\uB294 \uD310\uB9E4\uC790\uAC00 \uC790\uC728\uC801\uC73C\uB85C \uACB0\uC815\uD569\uB2C8\uB2E4.' +\n        '</div>'\n      );\n    }\n    \n    // Seller autonomy notice\n    if (!$('.seller-autonomy-reminder').length && $('#acf-field_seller_final_price').length) {\n      $('#acf-field_seller_final_price').closest('.acf-field').after(\n        '<div class=\"seller-autonomy-reminder\" style=\"background: #e8f5e8; border: 1px solid #4caf50; padding: 10px; margin: 5px 0; border-radius: 4px; font-size: 12px;\">' +\n        '<strong>\uD83C\uDFE6 \uAC00\uACA9 \uC790\uC728\uC131 \uBCF4\uC7A5:</strong> \uBC95\uB960\uC5D0 \uB530\uB77C \uD310\uB9E4\uAC00\uB97C \uC790\uC728\uC801\uC73C\uB85C \uACB0\uC815\uD560 \uAD8C\uB9AC\uAC00 \uBCF4\uC7A5\uB429\uB2C8\uB2E4.' +\n        '</div>'\n      );\n    }\n  }\n  \n  // Enhanced pricing change notifications\n  function showPriceChangeNotification(type) {\n    var noticeClass = 'price-change-notice-' + type;\n    if (!$('.' + noticeClass).length) {\n      var message = '';\n      var bgColor = '#fff3cd';\n      var borderColor = '#ffeaa7';\n      \n      switch(type) {\n        case 'supplier':\n          message = '<strong>\uD83D\uDEA8 \uC2B9\uC778 \uD544\uC694</strong><br/>\uACF5\uAE09\uAC00/MSRP/\uC218\uC218\uB8CC\uC728 \uBCC0\uACBD\uC2DC \uAD00\uB9AC\uC790 \uC2B9\uC778\uC774 \uD544\uC694\uD569\uB2C8\uB2E4.';\n          break;\n        case 'seller':\n          message = '<strong>\u2705 \uC790\uC728 \uAC00\uACA9 \uC124\uC815</strong><br/>\uD310\uB9E4\uAC00\uB97C \uC790\uC728\uC801\uC73C\uB85C \uACB0\uC815\uD558\uC168\uC2B5\uB2C8\uB2E4.';\n          bgColor = '#e8f5e8';\n          borderColor = '#4caf50';\n          break;\n      }\n      \n      $('body').append(\n        '<div class=\"' + noticeClass + '\" style=\"position: fixed; top: 20px; right: 20px; background: ' + bgColor + '; border: 1px solid ' + borderColor + '; padding: 15px; border-radius: 4px; z-index: 9999; max-width: 300px;\">' +\n        message +\n        '<button onclick=\"$(this).parent().remove()\" style=\"float: right; background: none; border: none; font-size: 16px;\">\u00D7</button>' +\n        '</div>'\n      );\n      \n      setTimeout(function() {\n        $('.' + noticeClass).fadeOut();\n      }, 5000);\n    }\n  }\n  \n  $(document).ready(function() {\n    // Initialize calculations on page load\n    calculateMSRPMargin();\n    calculateSellerProfit();\n    addLegalNotices();\n    \n    // Supplier field changes - require approval\n    $('#acf-field_cost_price, #acf-field_msrp, #acf-field_partner_commission_rate').on('input change', function() {\n      calculateMSRPMargin();\n      calculateSellerProfit();\n      showPriceChangeNotification('supplier');\n    });\n    \n    // Seller price changes - autonomous\n    $('#acf-field_seller_final_price').on('input change', function() {\n      calculateSellerProfit();\n      showPriceChangeNotification('seller');\n    });\n    \n    // Real-time calculations\n    $('#acf-field_cost_price, #acf-field_msrp, #acf-field_seller_final_price').on('input', function() {\n      calculateMSRPMargin();\n      calculateSellerProfit();\n    });\n  });\n  \n})(jQuery);\n</script>\n";
export declare const APPROVAL_WORKFLOW_SCRIPT = "\n<script>\n(function($) {\n  'use strict';\n  \n  // Set approval status when supplier fields change\n  function setApprovalPending() {\n    // Mark post as pending approval\n    $('#post-status-display').text('\uC2B9\uC778 \uB300\uAE30 \uC911');\n    $('#hidden_post_status').val('pending');\n    \n    // Add hidden field to track what needs approval\n    if (!$('#pending_approval_fields').length) {\n      $('#post').append('<input type=\"hidden\" id=\"pending_approval_fields\" name=\"pending_approval_fields\" value=\"pricing\">');\n    }\n  }\n  \n  // Reset approval status for seller autonomous changes\n  function setSellerAutonomous() {\n    // Seller changes don't need approval\n    if (!$('#autonomous_pricing_flag').length) {\n      $('#post').append('<input type=\"hidden\" id=\"autonomous_pricing_flag\" name=\"autonomous_pricing_flag\" value=\"true\">');\n    }\n  }\n  \n  $(document).ready(function() {\n    // Monitor supplier field changes\n    $('#acf-field_cost_price, #acf-field_msrp, #acf-field_partner_commission_rate').on('change', function() {\n      setApprovalPending();\n    });\n    \n    // Monitor seller field changes\n    $('#acf-field_seller_final_price').on('change', function() {\n      setSellerAutonomous();\n    });\n  });\n  \n})(jQuery);\n</script>\n";
//# sourceMappingURL=dropshipping-fields.d.ts.map