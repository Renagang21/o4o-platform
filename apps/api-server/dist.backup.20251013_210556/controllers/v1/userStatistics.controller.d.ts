import { Request, Response } from 'express';
import { ActivityCategory } from '../../entities/UserActivityLog';
export declare class UserStatisticsController {
    private static userRepository;
    private static activityRepository;
    private static betaUserRepository;
    static getUserStatistics(req: Request, res: Response): Promise<void>;
    static getUserRegistrationStats(days: number): Promise<{
        daily: any[];
        total: any;
    }>;
    static getActivityStatistics(days: number): Promise<{
        byCategory: {
            category: ActivityCategory;
            count: number;
            label: string;
        }[];
        daily: {
            date: any;
            count: number;
        }[];
        topTypes: {
            type: any;
            count: number;
            label: any;
        }[];
    }>;
    static getGeographicDistribution(days: number): Promise<{
        countries: {
            country: any;
            count: number;
        }[];
        cities: {
            city: any;
            country: any;
            count: number;
        }[];
    }>;
    static getTopActiveUsers(days: number, limit: number): Promise<{
        userId: any;
        email: any;
        firstName: any;
        lastName: any;
        fullName: string;
        role: any;
        activityCount: number;
    }[]>;
    static getSecurityStatistics(days: number): Promise<{
        totalSecurityActivities: number;
        failedLogins: number;
        suspiciousIPs: {
            ipAddress: any;
            userCount: number;
            activityCount: number;
        }[];
    }>;
    static getUserGrowthTrend(req: Request, res: Response): Promise<void>;
    static getRetentionStatistics(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=userStatistics.controller.d.ts.map