#!/usr/bin/env node

/**
 * API Server Environment Validation Script
 * Validates 7 categories for complete API server setup
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const validationResults = {
  environment: { status: 'CHECKING', message: '' },
  dependencies: { status: 'CHECKING', message: '' },
  configuration: { status: 'CHECKING', message: '' },
  scripts: { status: 'CHECKING', message: '' },
  build: { status: 'CHECKING', message: '' },
  services: { status: 'CHECKING', message: '' },
  performance: { status: 'CHECKING', message: '' }
};

// 1. Environment Variables
function validateEnvironment() {
  try {
    const serverType = process.env.SERVER_TYPE;
    const envFile = fs.existsSync('/etc/profile.d/o4o-apiserver.sh');
    
    if (serverType === 'apiserver' && envFile) {
      validationResults.environment = { 
        status: 'PASS', 
        message: 'SERVER_TYPE=apiserver configured' 
      };
    } else {
      validationResults.environment = { 
        status: 'FAIL', 
        message: 'Environment not properly configured' 
      };
    }
  } catch (error) {
    validationResults.environment = { 
      status: 'FAIL', 
      message: error.message 
    };
  }
}

// 2. Dependencies Check
function validateDependencies() {
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const hasApiDeps = packageJson.dependencies && 
                       packageJson.dependencies['bcrypt'] && 
                       packageJson.dependencies['jsonwebtoken'];
    
    if (hasApiDeps) {
      validationResults.dependencies = { 
        status: 'PASS', 
        message: 'API server dependencies present' 
      };
    } else {
      validationResults.dependencies = { 
        status: 'WARN', 
        message: 'Some dependencies missing' 
      };
    }
  } catch (error) {
    validationResults.dependencies = { 
      status: 'FAIL', 
      message: error.message 
    };
  }
}

// 3. Configuration Files
function validateConfiguration() {
  try {
    const configs = [
      'ecosystem.config.apiserver.cjs',
      'apps/api-server/.env'
    ];
    
    const allExist = configs.every(file => fs.existsSync(file));
    
    if (allExist) {
      validationResults.configuration = { 
        status: 'PASS', 
        message: 'All configuration files present' 
      };
    } else {
      validationResults.configuration = { 
        status: 'WARN', 
        message: 'Some configuration files missing' 
      };
    }
  } catch (error) {
    validationResults.configuration = { 
      status: 'FAIL', 
      message: error.message 
    };
  }
}

// 4. Scripts Availability
function validateScripts() {
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const requiredScripts = ['pm2:start:apiserver', 'build:api', 'build:packages'];
    
    const hasAllScripts = requiredScripts.every(script => 
      packageJson.scripts && packageJson.scripts[script]
    );
    
    if (hasAllScripts) {
      validationResults.scripts = { 
        status: 'PASS', 
        message: 'All required scripts available' 
      };
    } else {
      validationResults.scripts = { 
        status: 'WARN', 
        message: 'Some scripts missing' 
      };
    }
  } catch (error) {
    validationResults.scripts = { 
      status: 'FAIL', 
      message: error.message 
    };
  }
}

// 5. Build System
function validateBuild() {
  try {
    const hasBuildDirs = fs.existsSync('packages/types/dist') || 
                        fs.existsSync('packages/utils/dist');
    
    if (hasBuildDirs) {
      validationResults.build = { 
        status: 'PASS', 
        message: 'Build outputs detected' 
      };
    } else {
      validationResults.build = { 
        status: 'INFO', 
        message: 'No build outputs yet' 
      };
    }
  } catch (error) {
    validationResults.build = { 
      status: 'FAIL', 
      message: error.message 
    };
  }
}

// 6. Service Status
function validateServices() {
  try {
    const pm2Status = execSync('pm2 list 2>/dev/null', { encoding: 'utf8' });
    const hasApiServer = pm2Status.includes('o4o-api-server');
    
    if (hasApiServer) {
      validationResults.services = { 
        status: 'PASS', 
        message: 'API server service configured' 
      };
    } else {
      validationResults.services = { 
        status: 'INFO', 
        message: 'Service not running' 
      };
    }
  } catch (error) {
    validationResults.services = { 
      status: 'INFO', 
      message: 'PM2 not available or service not configured' 
    };
  }
}

// 7. Performance Metrics
function validatePerformance() {
  try {
    // Check if optimized configuration exists
    const hasOptimizedConfig = fs.existsSync('package.apiserver.json');
    
    if (hasOptimizedConfig) {
      validationResults.performance = { 
        status: 'PASS', 
        message: 'Optimized configuration available' 
      };
    } else {
      validationResults.performance = { 
        status: 'WARN', 
        message: 'Using default configuration' 
      };
    }
  } catch (error) {
    validationResults.performance = { 
      status: 'FAIL', 
      message: error.message 
    };
  }
}

// Run all validations
function runValidation() {
  console.log('🔍 API Server Environment Validation');
  console.log('=====================================\n');
  
  validateEnvironment();
  validateDependencies();
  validateConfiguration();
  validateScripts();
  validateBuild();
  validateServices();
  validatePerformance();
  
  // Display results
  let passCount = 0;
  let failCount = 0;
  
  Object.entries(validationResults).forEach(([category, result]) => {
    const icon = result.status === 'PASS' ? '✅' : 
                 result.status === 'FAIL' ? '❌' : 
                 result.status === 'WARN' ? '⚠️' : 'ℹ️';
    
    console.log(`${icon} ${category.toUpperCase()}: ${result.status}`);
    console.log(`   ${result.message}\n`);
    
    if (result.status === 'PASS') passCount++;
    if (result.status === 'FAIL') failCount++;
  });
  
  console.log('=====================================');
  console.log(`Summary: ${passCount}/7 PASS, ${failCount} FAIL`);
  
  if (failCount > 0) {
    console.log('\n⚠️  Some validations failed. Please check the issues above.');
    process.exit(1);
  } else {
    console.log('\n✅ API Server environment is properly configured!');
  }
}

// Execute validation
runValidation();