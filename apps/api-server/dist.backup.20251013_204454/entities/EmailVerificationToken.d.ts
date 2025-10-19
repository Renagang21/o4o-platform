import { User } from './User';
export declare class EmailVerificationToken {
    id: string;
    token: string;
    userId: string;
    user: User;
    expiresAt: Date;
    email: string;
    usedAt: Date | null;
    createdAt: Date;
}
//# sourceMappingURL=EmailVerificationToken.d.ts.map