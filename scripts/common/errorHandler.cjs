#!/usr/bin/env node

/**
 * Error Handler Utility
 * 통합 에러 처리 및 복구 기능
 */

const { logger } = require('./logger.cjs');

/**
 * 에러 타입 정의
 */
const ErrorTypes = {
  MODULE_NOT_FOUND: 'MODULE_NOT_FOUND',
  ENVIRONMENT_ERROR: 'ENVIRONMENT_ERROR',
  BUILD_ERROR: 'BUILD_ERROR',
  PERMISSION_ERROR: 'PERMISSION_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  UNKNOWN: 'UNKNOWN'
};

/**
 * 에러 타입 감지
 */
function detectErrorType(error) {
  if (error.code === 'MODULE_NOT_FOUND') {
    return ErrorTypes.MODULE_NOT_FOUND;
  }
  if (error.code === 'EACCES' || error.code === 'EPERM') {
    return ErrorTypes.PERMISSION_ERROR;
  }
  if (error.message && error.message.includes('environment')) {
    return ErrorTypes.ENVIRONMENT_ERROR;
  }
  if (error.message && error.message.includes('build')) {
    return ErrorTypes.BUILD_ERROR;
  }
  if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
    return ErrorTypes.NETWORK_ERROR;
  }
  return ErrorTypes.UNKNOWN;
}

/**
 * 에러 처리 및 복구 시도
 */
function handleError(error, context = {}) {
  const errorType = detectErrorType(error);
  
  logger.error(`Error occurred in ${context.script || 'unknown script'}`);
  logger.debug(`Error type: ${errorType}`);
  logger.debug(`Error message: ${error.message}`);
  
  // 에러 타입별 처리
  switch (errorType) {
    case ErrorTypes.MODULE_NOT_FOUND:
      handleModuleError(error, context);
      break;
      
    case ErrorTypes.ENVIRONMENT_ERROR:
      handleEnvironmentError(error, context);
      break;
      
    case ErrorTypes.BUILD_ERROR:
      handleBuildError(error, context);
      break;
      
    case ErrorTypes.PERMISSION_ERROR:
      handlePermissionError(error, context);
      break;
      
    case ErrorTypes.NETWORK_ERROR:
      handleNetworkError(error, context);
      break;
      
    default:
      handleUnknownError(error, context);
  }
}

/**
 * 모듈 에러 처리
 */
function handleModuleError(error, context) {
  logger.error('Module not found error');
  logger.info('Suggested solutions:');
  logger.list([
    'Run "npm install" to install dependencies',
    'Check if the module path is correct',
    'Verify the file extension (.cjs for CommonJS modules)'
  ]);
  
  // Fallback 시도
  if (context.fallback) {
    logger.info('Attempting fallback...');
    try {
      context.fallback();
    } catch (fallbackError) {
      logger.error('Fallback failed: ' + fallbackError.message);
    }
  }
}

/**
 * 환경 에러 처리
 */
function handleEnvironmentError(error, context) {
  logger.error('Environment configuration error');
  logger.info('Suggested solutions:');
  logger.list([
    'Check SERVER_TYPE environment variable',
    'Verify .env files exist and are properly formatted',
    'Run "export SERVER_TYPE=local" (or webserver/apiserver)'
  ]);
  
  // 기본 환경으로 복구
  if (!process.env.SERVER_TYPE) {
    logger.info('Setting default environment to "local"');
    process.env.SERVER_TYPE = 'local';
  }
}

/**
 * 빌드 에러 처리
 */
function handleBuildError(error, context) {
  logger.error('Build error occurred');
  logger.info('Suggested solutions:');
  logger.list([
    'Clean build artifacts: "npm run clean:dist"',
    'Reinstall dependencies: "npm install"',
    'Check TypeScript errors: "npm run type-check"',
    'Increase memory: "export NODE_OPTIONS=--max-old-space-size=4096"'
  ]);
}

/**
 * 권한 에러 처리
 */
function handlePermissionError(error, context) {
  logger.error('Permission denied');
  logger.info('Suggested solutions:');
  logger.list([
    'Check file permissions',
    'Run with sudo if necessary (not recommended)',
    'Change file ownership: "chown -R $USER:$USER ."'
  ]);
}

/**
 * 네트워크 에러 처리
 */
function handleNetworkError(error, context) {
  logger.error('Network error');
  logger.info('Suggested solutions:');
  logger.list([
    'Check internet connection',
    'Verify proxy settings',
    'Try again later'
  ]);
}

/**
 * 알 수 없는 에러 처리
 */
function handleUnknownError(error, context) {
  logger.error('Unknown error occurred');
  logger.error(`Details: ${error.stack || error.message}`);
  logger.info('Please check the error details above and try again');
}

/**
 * Graceful shutdown
 */
function gracefulShutdown(code = 1) {
  logger.info('Performing graceful shutdown...');
  
  // PM2 프로세스 정리
  try {
    const { execSync } = require('child_process');
    execSync('pm2 save', { stdio: 'ignore' });
  } catch {
    // Silent fail
  }
  
  process.exit(code);
}

/**
 * 에러 래퍼 함수
 */
function wrapWithErrorHandler(fn, context = {}) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      handleError(error, context);
      gracefulShutdown(1);
    }
  };
}

module.exports = {
  ErrorTypes,
  detectErrorType,
  handleError,
  gracefulShutdown,
  wrapWithErrorHandler,
  handleModuleError,
  handleEnvironmentError,
  handleBuildError,
  handlePermissionError,
  handleNetworkError,
  handleUnknownError
};