import { productionConfig } from './production';

// Get configuration based on environment
const getConfig = () => {
  const env = import.meta.env.NODE_ENV || 'development';
  
  if (env === 'production') {
    return productionConfig;
  }
  
  // Development/local configuration using environment variables
  return {
    API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api',
    API_URL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
    SHOP_URL: import.meta.env.VITE_SHOP_URL || 'http://localhost:3002',
    ADMIN_URL: import.meta.env.VITE_ADMIN_URL || 'http://localhost:5173',
    MAIN_SITE_URL: import.meta.env.VITE_MAIN_SITE_URL || 'http://localhost:3000',
    NODE_ENV: env
  };
};

export const config = getConfig();