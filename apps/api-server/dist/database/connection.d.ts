import { DataSource } from 'typeorm';
export declare const AppDataSource: DataSource;
export declare function checkDatabaseHealth(): Promise<{
    status: string;
    error: string;
    host?: undefined;
    port?: undefined;
    database?: undefined;
    connectionCount?: undefined;
    maxConnections?: undefined;
    timestamp?: undefined;
} | {
    status: string;
    host: string;
    port: number;
    database: string;
    connectionCount: number;
    maxConnections: number;
    timestamp: string;
    error?: undefined;
} | {
    status: string;
    error: string;
    timestamp: string;
    host?: undefined;
    port?: undefined;
    database?: undefined;
    connectionCount?: undefined;
    maxConnections?: undefined;
}>;
export declare function closeDatabaseConnection(): Promise<void>;
export declare const initializeDatabase: () => Promise<DataSource>;
export default AppDataSource;
//# sourceMappingURL=connection.d.ts.map