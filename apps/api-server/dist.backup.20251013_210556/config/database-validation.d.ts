import { DataSource } from 'typeorm';
/**
 * Validate database connection
 */
export declare function validateDatabaseConnection(dataSource: DataSource): Promise<boolean>;
/**
 * Retry database connection
 */
export declare function retryDatabaseConnection(dataSource: DataSource, maxRetries?: number, delay?: number): Promise<boolean>;
//# sourceMappingURL=database-validation.d.ts.map