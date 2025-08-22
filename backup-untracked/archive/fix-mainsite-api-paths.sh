#!/bin/bash

echo "🔧 Fixing duplicate /v1/ paths in main-site app..."

# Fix authInterceptor.ts
sed -i "s|'/v1/auth/v2/refresh'|'/auth/v2/refresh'|g" apps/main-site/src/services/authInterceptor.ts

# Fix EmailVerificationError.tsx
sed -i "s|'/v1/auth/v2/resend-verification'|'/auth/v2/resend-verification'|g" apps/main-site/src/pages/auth/EmailVerificationError.tsx

# Fix ForgotPassword.tsx
sed -i "s|'/v1/auth/v2/forgot-password'|'/auth/v2/forgot-password'|g" apps/main-site/src/pages/auth/ForgotPassword.tsx

# Fix ResetPassword.tsx
sed -i "s|'/v1/auth/v2/reset-password'|'/auth/v2/reset-password'|g" apps/main-site/src/pages/auth/ResetPassword.tsx

# Fix OAuthCallback.tsx
sed -i "s|/v1/auth/oauth/|/auth/oauth/|g" apps/main-site/src/pages/auth/OAuthCallback.tsx

# Fix EmailVerificationSuccess.tsx
sed -i "s|/v1/auth/v2/verify-email|/auth/v2/verify-email|g" apps/main-site/src/pages/auth/EmailVerificationSuccess.tsx

# Fix SessionManager.tsx
sed -i "s|'/v1/sessions/my-sessions'|'/sessions/my-sessions'|g" apps/main-site/src/components/account/SessionManager.tsx
sed -i "s|'/v1/sessions/terminate'|'/sessions/terminate'|g" apps/main-site/src/components/account/SessionManager.tsx
sed -i "s|'/v1/sessions/terminate-all'|'/sessions/terminate-all'|g" apps/main-site/src/components/account/SessionManager.tsx

# Fix SocialLoginButtons.tsx and SocialLoginButtonsV2.tsx
sed -i "s|/v1/auth/oauth/|/auth/oauth/|g" apps/main-site/src/components/auth/SocialLoginButtons.tsx
sed -i "s|/v1/auth/oauth/|/auth/oauth/|g" apps/main-site/src/components/auth/SocialLoginButtonsV2.tsx

# Fix EmailVerificationPending.tsx
sed -i "s|'/v1/auth/v2/resend-verification'|'/auth/v2/resend-verification'|g" apps/main-site/src/pages/auth/EmailVerificationPending.tsx

echo "✅ Fixed all duplicate /v1/ paths in main-site app"
echo ""
echo "📝 Changes made:"
echo "  - /v1/auth/v2/* → /auth/v2/*"
echo "  - /v1/sessions/* → /sessions/*"
echo "  - /v1/auth/oauth/* → /auth/oauth/*"