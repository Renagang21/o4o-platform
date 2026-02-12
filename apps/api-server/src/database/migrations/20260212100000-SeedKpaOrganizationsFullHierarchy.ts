import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * WO-KPA-ORGANIZATION-SEED-V1
 *
 * Seeds full KPA organization hierarchy:
 * - 1 본회 (association): 대한약사회 (already exists)
 * - 17 지부 (branch): 시/도 약사회
 * - ~226 분회 (group): 시/군/구 약사회
 *
 * Idempotent: checks by name+type before inserting.
 * Existing test data (서울특별시약사회, 종로구/강남구약사회) preserved.
 */
export class SeedKpaOrganizationsFullHierarchy20260212100000 implements MigrationInterface {
  name = 'SeedKpaOrganizationsFullHierarchy20260212100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('[SEED] KPA Organizations Full Hierarchy - Starting...');

    // Helper: insert org if not exists, return id
    const upsertOrg = async (
      name: string,
      type: string,
      parentId: string | null,
      description: string | null
    ): Promise<string> => {
      const existing = await queryRunner.query(
        `SELECT id FROM kpa_organizations WHERE name = $1 AND type = $2`,
        [name, type]
      );
      if (existing.length > 0) return existing[0].id;

      const result = await queryRunner.query(
        `INSERT INTO kpa_organizations (id, name, type, parent_id, description, is_active, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, true, NOW(), NOW())
         RETURNING id`,
        [name, type, parentId, description]
      );
      return result[0].id;
    };

    // ── Step 1: 본회 (Association) ──
    const associationId = await upsertOrg('대한약사회', 'association', null, '대한약사회 본회');
    console.log(`[SEED] Association: 대한약사회 (${associationId})`);

    // ── Step 2: 지부 (Branches) = 시/도 약사회 ──
    // 17개 시도 (세종특별자치시 포함)
    const branchData: Array<{ name: string; desc: string; groups: string[] }> = [
      {
        name: '서울특별시약사회',
        desc: '서울특별시 지부',
        groups: [
          '종로구', '중구', '용산구', '성동구', '광진구',
          '동대문구', '중랑구', '성북구', '강북구', '도봉구',
          '노원구', '은평구', '서대문구', '마포구', '양천구',
          '강서구', '구로구', '금천구', '영등포구', '동작구',
          '관악구', '서초구', '강남구', '송파구', '강동구',
        ],
      },
      {
        name: '부산광역시약사회',
        desc: '부산광역시 지부',
        groups: [
          '중구', '서구', '동구', '영도구', '부산진구',
          '동래구', '남구', '북구', '해운대구', '사하구',
          '금정구', '강서구', '연제구', '수영구', '사상구',
          '기장군',
        ],
      },
      {
        name: '대구광역시약사회',
        desc: '대구광역시 지부',
        groups: [
          '중구', '동구', '서구', '남구', '북구',
          '수성구', '달서구', '달성군', '군위군',
        ],
      },
      {
        name: '인천광역시약사회',
        desc: '인천광역시 지부',
        groups: [
          '중구', '동구', '미추홀구', '연수구', '남동구',
          '부평구', '계양구', '서구', '강화군', '옹진군',
        ],
      },
      {
        name: '광주광역시약사회',
        desc: '광주광역시 지부',
        groups: [
          '동구', '서구', '남구', '북구', '광산구',
        ],
      },
      {
        name: '대전광역시약사회',
        desc: '대전광역시 지부',
        groups: [
          '동구', '중구', '서구', '유성구', '대덕구',
        ],
      },
      {
        name: '울산광역시약사회',
        desc: '울산광역시 지부',
        groups: [
          '중구', '남구', '동구', '북구', '울주군',
        ],
      },
      {
        name: '세종특별자치시약사회',
        desc: '세종특별자치시 지부',
        groups: [
          '세종시',  // 세종은 하위 시군구 없음 → 단일 분회
        ],
      },
      {
        name: '경기도약사회',
        desc: '경기도 지부',
        groups: [
          '수원시', '성남시', '의정부시', '안양시', '부천시',
          '광명시', '평택시', '동두천시', '안산시', '고양시',
          '과천시', '구리시', '남양주시', '오산시', '시흥시',
          '군포시', '의왕시', '하남시', '용인시', '파주시',
          '이천시', '안성시', '김포시', '화성시', '광주시',
          '양주시', '포천시', '여주시', '연천군', '가평군',
          '양평군',
        ],
      },
      {
        name: '강원특별자치도약사회',
        desc: '강원특별자치도 지부',
        groups: [
          '춘천시', '원주시', '강릉시', '동해시', '태백시',
          '속초시', '삼척시', '홍천군', '횡성군', '영월군',
          '평창군', '정선군', '철원군', '화천군', '양구군',
          '인제군', '고성군', '양양군',
        ],
      },
      {
        name: '충청북도약사회',
        desc: '충청북도 지부',
        groups: [
          '청주시', '충주시', '제천시', '보은군', '옥천군',
          '영동군', '증평군', '진천군', '괴산군', '음성군',
          '단양군',
        ],
      },
      {
        name: '충청남도약사회',
        desc: '충청남도 지부',
        groups: [
          '천안시', '공주시', '보령시', '아산시', '서산시',
          '논산시', '계룡시', '당진시', '금산군', '부여군',
          '서천군', '청양군', '홍성군', '예산군', '태안군',
        ],
      },
      {
        name: '전북특별자치도약사회',
        desc: '전북특별자치도 지부',
        groups: [
          '전주시', '군산시', '익산시', '정읍시', '남원시',
          '김제시', '완주군', '진안군', '무주군', '장수군',
          '임실군', '순창군', '고창군', '부안군',
        ],
      },
      {
        name: '전라남도약사회',
        desc: '전라남도 지부',
        groups: [
          '목포시', '여수시', '순천시', '나주시', '광양시',
          '담양군', '곡성군', '구례군', '고흥군', '보성군',
          '화순군', '장흥군', '강진군', '해남군', '영암군',
          '무안군', '함평군', '영광군', '장성군', '완도군',
          '진도군', '신안군',
        ],
      },
      {
        name: '경상북도약사회',
        desc: '경상북도 지부',
        groups: [
          '포항시', '경주시', '김천시', '안동시', '구미시',
          '영주시', '영천시', '상주시', '문경시', '경산시',
          '의성군', '청송군', '영양군', '영덕군', '청도군',
          '고령군', '성주군', '칠곡군', '예천군', '봉화군',
          '울진군', '울릉군',
        ],
      },
      {
        name: '경상남도약사회',
        desc: '경상남도 지부',
        groups: [
          '창원시', '진주시', '통영시', '사천시', '김해시',
          '밀양시', '거제시', '양산시', '의령군', '함안군',
          '창녕군', '고성군', '남해군', '하동군', '산청군',
          '함양군', '거창군', '합천군',
        ],
      },
      {
        name: '제주특별자치도약사회',
        desc: '제주특별자치도 지부',
        groups: [
          '제주시', '서귀포시',
        ],
      },
    ];

    let branchCount = 0;
    let groupCount = 0;

    for (const branch of branchData) {
      const branchId = await upsertOrg(branch.name, 'branch', associationId, branch.desc);
      branchCount++;
      console.log(`[SEED] Branch: ${branch.name} → ${branch.groups.length} groups`);

      for (const groupName of branch.groups) {
        const fullGroupName = `${groupName}약사회`;
        await upsertOrg(fullGroupName, 'group', branchId, `${groupName} 분회`);
        groupCount++;
      }
    }

    console.log('');
    console.log('=== KPA Organization Seed Complete ===');
    console.log(`  Association: 1 (대한약사회)`);
    console.log(`  Branches (지부): ${branchCount}`);
    console.log(`  Groups (분회): ${groupCount}`);
    console.log(`  Total: ${1 + branchCount + groupCount}`);
    console.log('');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Keep the 4 original test organizations, remove only newly seeded ones
    const originalIds = [
      'a0000000-0a00-4000-a000-000000000001', // 대한약사회
      'a0000000-0a00-4000-a000-000000000002', // 서울특별시약사회
      'a0000000-0a00-4000-a000-000000000003', // 종로구약사회
      'a0000000-0a00-4000-a000-000000000004', // 강남구약사회
    ];

    // Delete groups first (FK constraint), then branches
    await queryRunner.query(`
      DELETE FROM kpa_organizations
      WHERE type = 'group' AND id NOT IN ($1, $2, $3, $4)
    `, originalIds);

    await queryRunner.query(`
      DELETE FROM kpa_organizations
      WHERE type = 'branch' AND id NOT IN ($1, $2, $3, $4)
    `, originalIds);

    console.log('[SEED] Removed seeded organizations (kept original 4 test orgs)');
  }
}
