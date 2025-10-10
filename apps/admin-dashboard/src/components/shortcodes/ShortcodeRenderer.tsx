import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';

// Import all shortcode components
import { dropshippingShortcodes } from './dropshipping';
import { 
  PartnerMainDashboard,
  PartnerProducts,
  PartnerCommissions,
  PartnerLinkGenerator,
  CommissionDashboard,
  PayoutRequests,
  UserDashboard,
  RoleVerification
} from './dropshipping';
import adminComponents from './admin';

// Shortcode component map
const COMPONENT_MAP = {
  // Partner components
  'PartnerMainDashboard': PartnerMainDashboard,
  'PartnerProducts': PartnerProducts,
  'PartnerCommissions': PartnerCommissions,
  'PartnerLinkGenerator': PartnerLinkGenerator,
  'CommissionDashboard': CommissionDashboard,
  'PayoutRequests': PayoutRequests,
  
  // Admin components
  'AdminApprovalQueue': adminComponents.AdminApprovalQueue,
  'admin_approval_queue': adminComponents.AdminApprovalQueue,
  'AdminPlatformStats': adminComponents.AdminPlatformStats,
  'admin_platform_stats': adminComponents.AdminPlatformStats,
  
  // Core components
  'UserDashboard': UserDashboard,
  'RoleVerification': RoleVerification
};

interface ShortcodeProps {
  name: string;
  attributes?: Record<string, unknown>;
  content?: string;
}

interface ShortcodeError {
  type: 'component_not_found' | 'auth_required' | 'permission_denied' | 'network_error' | 'unknown';
  message: string;
  details?: string;
}

const ShortcodeRenderer: React.FC<ShortcodeProps> = ({ name, attributes = {}, content = '' }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ShortcodeError | null>(null);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setAuthenticated(false);
        setLoading(false);
        return;
      }

      // Verify token with API
      const response = await fetch('/api/v1/auth/verify', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      setAuthenticated(response.ok);
    } catch (error) {
      setAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const renderError = (error: ShortcodeError) => {
    const getErrorIcon = () => {
      switch (error.type) {
        case 'auth_required':
          return '🔐';
        case 'permission_denied':
          return '🚫';
        case 'component_not_found':
          return '🔍';
        case 'network_error':
          return '🌐';
        default:
          return '⚠️';
      }
    };

    return (
      <Alert variant="destructive" className="my-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <div className="flex items-center space-x-2">
            <span className="text-lg">{getErrorIcon()}</span>
            <div>
              <strong>{error.message}</strong>
              {error.details && (
                <div className="text-sm mt-1 text-gray-600">{error.details}</div>
              )}
            </div>
          </div>
        </AlertDescription>
      </Alert>
    );
  };

  const renderComponent = () => {
    // Check if shortcode exists
    const shortcodeConfig = dropshippingShortcodes[name as keyof typeof dropshippingShortcodes];
    if (!shortcodeConfig) {
      setError({
        type: 'component_not_found',
        message: `Shortcode [${name}] not found`,
        details: `Available shortcodes: ${Object.keys(dropshippingShortcodes).join(', ')}`
      });
      return null;
    }

    // Get component from map
    const Component = COMPONENT_MAP[shortcodeConfig.component as keyof typeof COMPONENT_MAP];
    if (!Component) {
      setError({
        type: 'component_not_found',
        message: `Component ${shortcodeConfig.component} not found`,
        details: 'This shortcode is registered but the component is not available'
      });
      return null;
    }

    // Check authentication for partner shortcodes
    const requiresAuth = name.startsWith('partner_');
    if (requiresAuth && !authenticated) {
      setError({
        type: 'auth_required',
        message: 'Authentication required',
        details: 'Please log in to access partner features'
      });
      return null;
    }

    // Render component with attributes
    try {
      // Pass attributes directly without content prop for these components
      const shortcodeKey = name.split('_')[0];
      
      // Special handling for role-verification which requires a type prop
      if (shortcodeKey === 'role-verification' || name === 'RoleVerification') {
        const verificationAttributes = {
          type: (attributes.type as 'supplier' | 'seller' | 'affiliate') || 'supplier',
          ...attributes
        };
        return <Component {...verificationAttributes} />;
      }
      
      if (['dropshipping-dashboard', 'partner-products', 'partner-commissions', 'approval-queue'].includes(shortcodeKey)) {
        return <Component {...attributes} />;
      }
      // For other components that don't need special handling
      // Default to providing a type prop if the component is RoleVerification
      if (shortcodeConfig.component === 'RoleVerification') {
        const defaultProps = {
          type: 'supplier' as const,
          ...attributes
        };
        return <Component {...defaultProps} />;
      }
      // For all other components
      return <Component {...attributes} />;
    } catch (componentError) {
      setError({
        type: 'unknown',
        message: 'Component render error',
        details: componentError instanceof Error ? componentError.message : 'Unknown error occurred'
      });
      return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Loading shortcode...</span>
      </div>
    );
  }

  if (error) {
    return renderError(error);
  }

  return (
    <div className="shortcode-container" data-shortcode={name}>
      {renderComponent()}
    </div>
  );
};

// WordPress-style shortcode registration function
export const registerShortcodes = () => {
  // This would be called by WordPress to register shortcodes
  const shortcodes: Record<string, {
    callback: (attributes?: Record<string, unknown>, content?: string) => string;
  }> = {};
  
  Object.keys(dropshippingShortcodes).forEach(shortcodeName => {
    const config = dropshippingShortcodes[shortcodeName as keyof typeof dropshippingShortcodes];
    
    shortcodes[shortcodeName] = {
      callback: (attributes: Record<string, unknown> = {}, content: string = '') => {
        return `<div id="shortcode-${shortcodeName}-${Date.now()}"></div>
        <script>
          window.renderShortcode('${shortcodeName}', ${JSON.stringify(attributes)}, '${content}');
        </script>`;
      }
    };
  });
  
  return shortcodes;
};

// Helper function to render shortcode in WordPress context
export const renderShortcodeInWordPress = (name: string, attributes: Record<string, unknown>, content: string) => {
  const container = document.getElementById(`shortcode-${name}-container`);
  if (container && window.React && window.ReactDOM) {
    window.ReactDOM.render(
      window.React.createElement(ShortcodeRenderer, { name, attributes, content }),
      container
    );
  }
};

// Export shortcode information for WordPress admin
export const getShortcodeInfo = () => {
  return Object.keys(dropshippingShortcodes).map(name => ({
    name,
    tag: `[${name}]`,
    description: dropshippingShortcodes[name as keyof typeof dropshippingShortcodes]?.description,
    attributes: (dropshippingShortcodes as any)[name]?.attributes || {},
    example: `[${name}${Object.keys(dropshippingShortcodes[name as keyof typeof dropshippingShortcodes]?.attributes || {}).length > 0 
      ? ` ${Object.keys(dropshippingShortcodes[name as keyof typeof dropshippingShortcodes]?.attributes || {}).slice(0, 2).map((attr: string) => 
          `${attr}="${dropshippingShortcodes[name as keyof typeof dropshippingShortcodes]?.attributes?.[attr]?.default || 'value'}"`
        ).join(' ')}`
      : ''}]`,
    category: name.startsWith('partner_') ? 'Partner Portal' : 'General'
  }));
};

export default ShortcodeRenderer;