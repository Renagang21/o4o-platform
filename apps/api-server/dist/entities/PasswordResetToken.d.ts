import { User } from './User';
export declare class PasswordResetToken {
    id: string;
    token: string;
    userId: string;
    user: User;
    expiresAt: Date;
    email: string;
    usedAt: Date | null;
    createdAt: Date;
}
//# sourceMappingURL=PasswordResetToken.d.ts.map