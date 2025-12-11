/**
 * Module Loader Discovery Test
 * Tests whether ModuleLoader can discover Cosmetics apps
 */

import { moduleLoader } from './modules/module-loader.js';
import logger from './utils/logger.js';

async function testModuleDiscovery() {
    console.log('='.repeat(60));
    console.log('Module Loader Discovery Test - Cosmetics Suite');
    console.log('='.repeat(60));
    console.log('');

    // Test 1: Workspace Scanning
    console.log('📋 Test 1: Scanning workspace for manifest files...');
    try {
        const manifests = await moduleLoader.scanWorkspace();
        console.log(`✅ Found ${manifests.length} manifest files`);

        const cosmeticsManifests = manifests.filter(m =>
            m.includes('cosmetics') || m.includes('dropshipping')
        );
        console.log(`   └─ Cosmetics-related manifests: ${cosmeticsManifests.length}`);
        cosmeticsManifests.forEach(m => console.log(`      - ${m}`));
    } catch (error) {
        console.error('❌ Workspace scanning failed:', error);
    }
    console.log('');

    // Test 2: Load All Modules
    console.log('📦 Test 2: Loading all modules...');
    try {
        await moduleLoader.loadAll();
        const allModules = moduleLoader.getAllModules();
        console.log(`✅ Loaded ${allModules.length} modules`);
        console.log(`   Modules: ${allModules.join(', ')}`);
    } catch (error) {
        console.error('❌ Module loading failed:', error);
    }
    console.log('');

    // Test 3: Check Cosmetics Apps Specifically
    console.log('🧪 Test 3: Checking Cosmetics Suite apps...');

    const cosmeticsApps = [
        'dropshipping-cosmetics',
        'cosmetics-seller-extension'
    ];

    for (const appId of cosmeticsApps) {
        const module = moduleLoader.getModule(appId);
        if (module) {
            console.log(`✅ ${appId}`);
            console.log(`   └─ Status: ${module.status}`);
            console.log(`   └─ Version: ${module.module.version}`);
            console.log(`   └─ Dependencies: ${module.module.dependsOn?.join(', ') || 'none'}`);
            console.log(`   └─ Has Install Hook: ${!!module.module.lifecycle?.install}`);
            console.log(`   └─ Has Activate Hook: ${!!module.module.lifecycle?.activate}`);
            console.log(`   └─ Has Routes: ${!!module.module.backend?.routes}`);
        } else {
            console.log(`❌ ${appId} - NOT FOUND`);
        }
        console.log('');
    }

    // Test 4: Dependency Verification
    console.log('🔗 Test 4: Verifying dependencies...');
    for (const appId of cosmeticsApps) {
        const isValid = moduleLoader.verifyDependencies(appId);
        console.log(`   ${appId}: ${isValid ? '✅ Dependencies satisfied' : '❌ Missing dependencies'}`);
    }
    console.log('');

    // Test 5: Active Modules
    console.log('⚡ Test 5: Active modules...');
    const activeModules = moduleLoader.getActiveModules();
    console.log(`   Active: ${activeModules.length}`);
    console.log(`   List: ${activeModules.join(', ') || '(none)'}`);
    console.log('');

    console.log('='.repeat(60));
    console.log('Test Complete');
    console.log('='.repeat(60));
}

// Run test
testModuleDiscovery()
    .then(() => {
        console.log('✅ All tests completed');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Test failed:', error);
        process.exit(1);
    });
