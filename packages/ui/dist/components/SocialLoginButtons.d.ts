import { FC } from 'react';
interface SocialLoginButtonsProps {
    onSocialLogin?: (provider: 'google' | 'kakao' | 'naver') => void;
    disabled?: boolean;
    showLabels?: boolean;
    size?: 'small' | 'medium' | 'large';
}
export declare const SocialLoginButtons: FC<SocialLoginButtonsProps>;
export {};
//# sourceMappingURL=SocialLoginButtons.d.ts.map