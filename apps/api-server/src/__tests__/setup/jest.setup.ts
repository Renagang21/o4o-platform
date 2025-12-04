/**
 * Jest Global Setup
 * Mocks problematic ESM modules for test environment
 */

// Mock database connection to prevent ESM import.meta.url issues
jest.mock('../../database/connection', () => ({
  AppDataSource: {
    isInitialized: false,
    initialize: jest.fn(),
    destroy: jest.fn(),
    query: jest.fn(),
    getRepository: jest.fn(),
  },
  checkDatabaseHealth: jest.fn(),
  closeDatabaseConnection: jest.fn(),
  initializeDatabase: jest.fn(),
}));

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DB_TYPE = 'sqlite';
process.env.DB_DATABASE = ':memory:';
