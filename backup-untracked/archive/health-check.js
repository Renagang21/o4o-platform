#!/usr/bin/env node

/**
 * Health Check Script for O4O Platform
 * 배포 후 서비스 상태를 확인하는 스크립트
 */

const https = require('https');
const http = require('http');

const services = [
  {
    name: 'API Server',
    url: process.env.API_URL || 'http://localhost:4000/health',
    timeout: 5000,
    required: true
  },
  {
    name: 'Main Site',
    url: process.env.WEB_URL || 'http://localhost:3000',
    timeout: 5000,
    required: true
  },
  {
    name: 'Admin Dashboard',
    url: process.env.ADMIN_URL || 'http://localhost:3001',
    timeout: 5000,
    required: true
  }
];

async function checkService(service) {
  return new Promise((resolve) => {
    const protocol = service.url.startsWith('https') ? https : http;
    const startTime = Date.now();
    
    const req = protocol.get(service.url, { timeout: service.timeout }, (res) => {
      const responseTime = Date.now() - startTime;
      
      if (res.statusCode >= 200 && res.statusCode < 400) {
        resolve({
          service: service.name,
          status: 'healthy',
          statusCode: res.statusCode,
          responseTime: `${responseTime}ms`,
          url: service.url
        });
      } else {
        resolve({
          service: service.name,
          status: 'unhealthy',
          statusCode: res.statusCode,
          responseTime: `${responseTime}ms`,
          url: service.url
        });
      }
    });
    
    req.on('error', (error) => {
      resolve({
        service: service.name,
        status: 'error',
        error: error.message,
        url: service.url
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({
        service: service.name,
        status: 'timeout',
        error: `Timeout after ${service.timeout}ms`,
        url: service.url
      });
    });
  });
}

async function runHealthChecks() {
  console.log('🏥 O4O Platform Health Check\n');
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Timestamp: ${new Date().toISOString()}\n`);
  
  const results = await Promise.all(services.map(checkService));
  
  let allHealthy = true;
  
  results.forEach(result => {
    const icon = result.status === 'healthy' ? '✅' : '❌';
    console.log(`${icon} ${result.service}`);
    console.log(`   Status: ${result.status}`);
    if (result.statusCode) {
      console.log(`   Status Code: ${result.statusCode}`);
    }
    if (result.responseTime) {
      console.log(`   Response Time: ${result.responseTime}`);
    }
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    console.log(`   URL: ${result.url}\n`);
    
    if (result.status !== 'healthy' && services.find(s => s.name === result.service).required) {
      allHealthy = false;
    }
  });
  
  if (allHealthy) {
    console.log('✅ All services are healthy!');
    process.exit(0);
  } else {
    console.log('❌ Some services are not healthy!');
    process.exit(1);
  }
}

// Run health checks
runHealthChecks().catch(error => {
  console.error('❌ Health check failed:', error);
  process.exit(1);
});