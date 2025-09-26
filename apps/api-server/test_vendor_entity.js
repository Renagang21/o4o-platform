// Simple test to check VendorInfo entity
const { AppDataSource } = require('./dist/database/connection');
const { VendorInfo } = require('./dist/entities/VendorInfo');

async function testVendorEntity() {
  try {
    console.log('Initializing database connection...');
    await AppDataSource.initialize();
    console.log('Database connection initialized');

    console.log('Getting VendorInfo repository...');
    const vendorRepository = AppDataSource.getRepository(VendorInfo);
    console.log('Repository created successfully');

    console.log('Testing simple query...');
    const count = await vendorRepository.count();
    console.log('Vendor count:', count);

    console.log('Testing query builder...');
    const queryBuilder = vendorRepository.createQueryBuilder('vendor');
    const testCount = await queryBuilder.getCount();
    console.log('Query builder count:', testCount);

    await AppDataSource.destroy();
    console.log('Test completed successfully');

  } catch (error) {
    console.error('Error during test:', error);
    process.exit(1);
  }
}

testVendorEntity();