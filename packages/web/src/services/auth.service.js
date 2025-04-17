-- 기본 역할 생성
INSERT INTO roles (name, description, created_at, updated_at)
VALUES 
    ('user', '일반 사용자', NOW(), NOW()),
    ('pharmacist', '약사 사용자', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- 관리자 역할 생성
INSERT INTO admin_roles (name, description, created_at, updated_at)
VALUES 
    ('system_admin', '시스템 관리자', NOW(), NOW()),
    ('service_admin', '서비스 관리자', NOW(), NOW()),
    ('store_admin', '스토어 관리자', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- 테스트용 관리자 계정 생성 (필요시)
INSERT INTO users (email, phone_number, status, created_at, updated_at)
VALUES 
    ('admin@example.com', '01012345678', 'active', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- 생성된 관리자에게 시스템 관리자 역할 부여
INSERT INTO user_admin_roles (user_id, admin_role_id, created_at, updated_at)
SELECT 
    u.id, 
    ar.id,
    NOW(),
    NOW()
FROM 
    users u,
    admin_roles ar
WHERE 
    u.email = 'admin@example.com'
    AND ar.name = 'system_admin'
ON CONFLICT (user_id, admin_role_id) DO NOTHING;