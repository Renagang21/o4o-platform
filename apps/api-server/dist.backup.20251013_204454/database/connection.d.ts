import { DataSource } from 'typeorm';
export declare const AppDataSource: DataSource;
export declare function checkDatabaseHealth(): Promise<any>;
export declare function closeDatabaseConnection(): Promise<void>;
export declare const initializeDatabase: () => Promise<DataSource>;
export default AppDataSource;
//# sourceMappingURL=connection.d.ts.map