const path = require('path');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

module.exports = {
  mode: process.env.NODE_ENV || 'production',
  
  entry: {
    // Core system
    'block-core': './packages/block-core/src/index.ts',
    
    // Block plugins (will be added as we create them)
    // 'text-content-blocks': './packages/blocks/text-content/src/index.ts',
    // 'layout-media-blocks': './packages/blocks/layout-media/src/index.ts',
    // 'interactive-blocks': './packages/blocks/interactive/src/index.ts',
    // 'dynamic-blocks': './packages/blocks/dynamic/src/index.ts',
  },
  
  output: {
    path: path.resolve(__dirname, 'dist/blocks'),
    filename: '[name]/bundle.[contenthash:8].js',
    chunkFilename: '[name]/chunk.[contenthash:8].js',
    publicPath: '/blocks/',
    clean: true,
    
    // Library configuration for plugins
    library: {
      name: ['O4O', '[name]'],
      type: 'umd',
    },
  },
  
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    alias: {
      '@o4o/block-core': path.resolve(__dirname, 'packages/block-core/src'),
      '@o4o/text-content-blocks': path.resolve(__dirname, 'packages/blocks/text-content/src'),
      '@o4o/layout-media-blocks': path.resolve(__dirname, 'packages/blocks/layout-media/src'),
      '@o4o/interactive-blocks': path.resolve(__dirname, 'packages/blocks/interactive/src'),
      '@o4o/dynamic-blocks': path.resolve(__dirname, 'packages/blocks/dynamic/src'),
    },
  },
  
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', {
                targets: {
                  browsers: ['last 2 versions', 'ie >= 11']
                },
                modules: false
              }],
              '@babel/preset-react',
              '@babel/preset-typescript',
            ],
            plugins: [
              '@babel/plugin-syntax-dynamic-import',
              '@babel/plugin-proposal-class-properties',
              '@babel/plugin-transform-runtime',
            ],
          },
        },
      },
      {
        test: /\.css$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              modules: {
                auto: true,
                localIdentName: '[name]__[local]--[hash:base64:5]',
              },
            },
          },
          'postcss-loader',
        ],
      },
      {
        test: /\.(png|jpg|jpeg|gif|svg)$/,
        type: 'asset',
        parser: {
          dataUrlCondition: {
            maxSize: 8 * 1024, // 8kb
          },
        },
      },
    ],
  },
  
  optimization: {
    usedExports: true,
    sideEffects: false,
    
    splitChunks: {
      chunks: 'all',
      maxAsyncRequests: 30,
      maxInitialRequests: 5,
      minSize: 20000,
      
      cacheGroups: {
        // WordPress packages
        wordpress: {
          test: /[\\/]node_modules[\\/]@wordpress[\\/]/,
          name: 'wordpress-vendor',
          priority: 30,
          reuseExistingChunk: true,
          enforce: true,
        },
        
        // React packages
        react: {
          test: /[\\/]node_modules[\\/](react|react-dom|react-router)[\\/]/,
          name: 'react-vendor',
          priority: 25,
          enforce: true,
        },
        
        // Block core (shared by all plugins)
        blockCore: {
          test: /[\\/]packages[\\/]block-core[\\/]/,
          name: 'block-core-shared',
          priority: 20,
          minChunks: 2,
          reuseExistingChunk: true,
        },
        
        // Common utilities
        common: {
          minChunks: 2,
          priority: 10,
          reuseExistingChunk: true,
          name(module, chunks, cacheGroupKey) {
            const allChunksNames = chunks.map((chunk) => chunk.name).join('-');
            return `common-${allChunksNames}`;
          },
        },
        
        // Default vendors
        vendors: {
          test: /[\\/]node_modules[\\/]/,
          priority: -10,
          name: 'vendors',
        },
        
        // Default
        default: {
          minChunks: 2,
          priority: -20,
          reuseExistingChunk: true,
        },
      },
    },
    
    // Runtime chunk for better caching
    runtimeChunk: {
      name: 'runtime',
    },
    
    // Module IDs for better caching
    moduleIds: 'deterministic',
    
    // Minimize in production
    minimize: process.env.NODE_ENV === 'production',
  },
  
  plugins: [
    // Bundle analyzer (only in analyze mode)
    ...(process.env.ANALYZE === 'true' ? [
      new BundleAnalyzerPlugin({
        analyzerMode: 'static',
        openAnalyzer: false,
        reportFilename: path.resolve(__dirname, 'reports/blocks-bundle-analysis.html'),
      })
    ] : []),
  ],
  
  // Externals for WordPress dependencies
  externals: {
    '@wordpress/blocks': 'window.wp.blocks',
    '@wordpress/block-editor': 'window.wp.blockEditor',
    '@wordpress/components': 'window.wp.components',
    '@wordpress/element': 'window.wp.element',
    '@wordpress/i18n': 'window.wp.i18n',
    '@wordpress/data': 'window.wp.data',
    'react': 'React',
    'react-dom': 'ReactDOM',
  },
  
  // Development settings
  devtool: process.env.NODE_ENV === 'production' ? 'source-map' : 'eval-source-map',
  
  stats: {
    colors: true,
    modules: false,
    children: false,
    chunks: false,
    chunkModules: false,
  },
};