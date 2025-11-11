import { AppDataSource } from '../database/connection.js';
import { Supplier } from '../entities/Supplier.js';
import bcrypt from 'bcrypt';

async function createTestSupplier() {
  try {
    await AppDataSource.initialize();
    console.log('Database connected successfully');

    const supplierRepo = AppDataSource.getRepository(Supplier);

    // Check if test supplier exists
    const existingSupplier = await supplierRepo.findOne({
      where: { email: 'dropship@neture.co.kr' }
    });

    if (existingSupplier) {
      console.log('Test supplier already exists:', existingSupplier.id);
      return existingSupplier;
    }

    // Create test supplier
    const hashedPassword = await bcrypt.hash('Test@1234', 10);
    const testSupplier = supplierRepo.create({
      name: 'Dropship Korea',
      email: 'dropship@neture.co.kr',
      password: hashedPassword,
      businessName: 'Dropship Korea Co., Ltd.',
      businessRegistration: '123-45-67890',
      phone: '02-1234-5678',
      address: '서울특별시 강남구 테헤란로 123',
      isVerified: true,
      status: 'active',
      profileImage: null,
      settings: {
        notifications: {
          email: true,
          sms: false
        },
        autoApproveOrders: false
      }
    });

    const savedSupplier = await supplierRepo.save(testSupplier);
    console.log('Test supplier created successfully:', savedSupplier.id);

    await AppDataSource.destroy();
    return savedSupplier;
  } catch (error) {
    console.error('Error creating test supplier:', error);
    process.exit(1);
  }
}

createTestSupplier();