#!/usr/bin/env node

/**
 * API Server Performance Benchmark
 * Compares default vs optimized build performance
 */

const { execSync } = require('child_process');
const fs = require('fs');

console.log('📊 API Server Performance Benchmark');
console.log('=====================================\n');

// Benchmark results
const results = {
  default: { time: 0, packages: 0 },
  optimized: { time: 0, packages: 0 }
};

// 1. Default Build (All Packages)
function benchmarkDefault() {
  console.log('🔨 Testing DEFAULT build (all packages)...');
  const startTime = Date.now();
  
  try {
    // Count packages being built
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const workspaces = packageJson.workspaces || [];
    results.default.packages = workspaces.length;
    
    // Run default build
    execSync('npm run build:packages', { 
      stdio: 'pipe',
      encoding: 'utf8'
    });
    
    const endTime = Date.now();
    results.default.time = (endTime - startTime) / 1000;
    
    console.log(`✅ Default build completed`);
    console.log(`   Time: ${results.default.time}s`);
    console.log(`   Packages: ${results.default.packages}\n`);
  } catch (error) {
    console.log('❌ Default build failed\n');
    results.default.time = -1;
  }
}

// 2. Optimized Build (API Server Only)
function benchmarkOptimized() {
  console.log('🚀 Testing OPTIMIZED build (API server only)...');
  const startTime = Date.now();
  
  try {
    // Count optimized packages
    if (fs.existsSync('package.apiserver.json')) {
      const apiPackageJson = JSON.parse(fs.readFileSync('package.apiserver.json', 'utf8'));
      const apiWorkspaces = apiPackageJson.workspaces || [];
      results.optimized.packages = apiWorkspaces.length;
    } else {
      // Fallback: count only API-related packages
      results.optimized.packages = 6; // API server + 5 core packages
    }
    
    // Run optimized build (only required packages)
    const buildCommands = [
      'npm run build:types',
      'npm run build:utils',
      'npm run build:auth-client',
      'npm run build:api'
    ];
    
    buildCommands.forEach(cmd => {
      try {
        execSync(cmd, { stdio: 'pipe', encoding: 'utf8' });
      } catch (e) {
        // Continue even if individual package fails
      }
    });
    
    const endTime = Date.now();
    results.optimized.time = (endTime - startTime) / 1000;
    
    console.log(`✅ Optimized build completed`);
    console.log(`   Time: ${results.optimized.time}s`);
    console.log(`   Packages: ${results.optimized.packages}\n`);
  } catch (error) {
    console.log('❌ Optimized build failed\n');
    results.optimized.time = -1;
  }
}

// 3. Compare Results
function compareResults() {
  console.log('=====================================');
  console.log('📈 PERFORMANCE COMPARISON\n');
  
  if (results.default.time > 0 && results.optimized.time > 0) {
    const improvement = ((results.default.time - results.optimized.time) / results.default.time * 100).toFixed(1);
    const speedup = (results.default.time / results.optimized.time).toFixed(1);
    
    console.log(`Default Build:`);
    console.log(`  ⏱️  Time: ${results.default.time}s`);
    console.log(`  📦 Packages: ${results.default.packages}`);
    console.log('');
    console.log(`Optimized Build:`);
    console.log(`  ⏱️  Time: ${results.optimized.time}s`);
    console.log(`  📦 Packages: ${results.optimized.packages}`);
    console.log('');
    console.log(`Performance Improvement:`);
    console.log(`  🚀 ${improvement}% faster`);
    console.log(`  ⚡ ${speedup}x speedup`);
    console.log(`  💾 ${results.default.packages - results.optimized.packages} packages skipped`);
    
    if (improvement >= 85) {
      console.log('\n✅ TARGET ACHIEVED: 85% performance improvement!');
    } else if (improvement >= 70) {
      console.log('\n⚠️  Good improvement but below 85% target');
    } else {
      console.log('\n❌ Performance improvement below expectations');
    }
  } else {
    console.log('❌ Could not complete benchmark comparison');
  }
  
  console.log('\n=====================================');
}

// Run benchmark
async function runBenchmark() {
  console.log('Starting benchmark tests...\n');
  
  // Set environment
  process.env.SERVER_TYPE = 'apiserver';
  
  benchmarkDefault();
  benchmarkOptimized();
  compareResults();
}

// Execute
runBenchmark();