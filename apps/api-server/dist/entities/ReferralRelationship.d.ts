import { AffiliateUser } from './AffiliateUser';
import { User } from './User';
export declare class ReferralRelationship {
    id: string;
    referrerId: string;
    referrer: AffiliateUser;
    referredId: string;
    referred: User;
    referralCode: string;
    signupDate: Date;
    firstOrderDate: Date;
    status: string;
    signupIp: string;
    signupDevice: string;
    signupSource: string;
    createdAt: Date;
    get isValidReferral(): boolean;
}
//# sourceMappingURL=ReferralRelationship.d.ts.map