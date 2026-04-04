import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * KPA Legal Documents 테이블 생성
 *
 * WO-KPA-A-OPERATOR-DASHBOARD-ENHANCEMENT-V3: Phase 3
 *
 * 이용약관, 개인정보처리방침 등 법률/정책 문서 관리 테이블.
 * document_type별로 최신 published 문서가 현재 적용본.
 *
 * 기본 데이터: terms(이용약관), privacy(개인정보처리방침) 각 1건 draft.
 */
export class CreateKpaLegalDocuments20260404000200
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if table already exists
    const hasTable = await queryRunner.hasTable('kpa_legal_documents');
    if (hasTable) {
      console.log('[CreateKpaLegalDocuments] Table already exists, skipping');
      return;
    }

    await queryRunner.query(`
      CREATE TABLE kpa_legal_documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        document_type VARCHAR(50) NOT NULL,
        title VARCHAR(200) NOT NULL,
        content TEXT NOT NULL DEFAULT '',
        status VARCHAR(20) NOT NULL DEFAULT 'draft',
        published_by UUID,
        published_at TIMESTAMP,
        created_by UUID,
        updated_by UUID,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_kpa_legal_doc_type_status ON kpa_legal_documents (document_type, status)
    `);

    console.log('[CreateKpaLegalDocuments] Table created');

    // Seed default documents
    await queryRunner.query(`
      INSERT INTO kpa_legal_documents (document_type, title, content, status)
      VALUES
        ('terms', '이용약관', '# 이용약관

## 제1조 (목적)
이 약관은 KPA Society(이하 "서비스")의 이용조건 및 절차, 회사와 회원 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.

## 제2조 (용어의 정의)
1. "서비스"란 회사가 제공하는 KPA Society 온라인 서비스를 말합니다.
2. "회원"이란 서비스에 접속하여 이 약관에 동의하고 회원가입을 완료한 자를 말합니다.

## 제3조 (약관의 효력 및 변경)
1. 이 약관은 서비스 화면에 게시함으로써 효력을 발생합니다.
2. 회사는 필요시 관련 법령을 위반하지 않는 범위에서 약관을 변경할 수 있습니다.

(이하 내용을 작성해 주세요)', 'draft'),
        ('privacy', '개인정보처리방침', '# 개인정보처리방침

## 제1조 (수집하는 개인정보 항목)
회사는 서비스 제공을 위해 다음과 같은 개인정보를 수집합니다.

### 필수 항목
- 이메일 주소
- 비밀번호
- 성명
- 연락처 (휴대폰 번호)
- 약사면허번호

### 선택 항목
- 소속 분회
- 약국명

## 제2조 (개인정보의 수집 및 이용 목적)
1. 회원 관리: 본인확인, 개인식별, 가입의사 확인
2. 서비스 제공: 교육 콘텐츠 제공, 커뮤니티 서비스 제공

(이하 내용을 작성해 주세요)', 'draft')
    `);

    console.log('[CreateKpaLegalDocuments] Default documents seeded (terms, privacy)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS kpa_legal_documents`);
    console.log('[CreateKpaLegalDocuments] Table dropped');
  }
}
