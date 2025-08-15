declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test';
    PORT?: string;
    DATABASE_URL: string;
    DATABASE_HOST: string;
    DATABASE_PORT: string;
    DATABASE_USER: string;
    DATABASE_PASSWORD: string;
    DATABASE_NAME: string;
    
    REDIS_HOST?: string;
    REDIS_PORT?: string;
    REDIS_PASSWORD?: string;
    REDIS_DB?: string;
    
    JWT_SECRET: string;
    JWT_EXPIRES_IN?: string;
    REFRESH_TOKEN_SECRET: string;
    REFRESH_TOKEN_EXPIRES_IN?: string;
    
    TOSS_CLIENT_KEY?: string;
    TOSS_SECRET_KEY?: string;
    TOSS_API_URL?: string;
    TOSS_WEBHOOK_SECRET?: string;
    
    PAYMENT_SUCCESS_URL?: string;
    PAYMENT_FAIL_URL?: string;
    PAYMENT_WEBHOOK_URL?: string;
    
    SMTP_HOST?: string;
    SMTP_PORT?: string;
    SMTP_USER?: string;
    SMTP_PASS?: string;
    EMAIL_FROM?: string;
    
    AWS_ACCESS_KEY_ID?: string;
    AWS_SECRET_ACCESS_KEY?: string;
    AWS_REGION?: string;
    AWS_S3_BUCKET?: string;
    
    SENTRY_DSN?: string;
    LOG_LEVEL?: string;
    ENABLE_METRICS?: string;
    
    CORS_ORIGIN?: string;
    SESSION_SECRET?: string;
    RATE_LIMIT_WINDOW?: string;
    RATE_LIMIT_MAX?: string;
  }
}