/**
 * CommunityContentsPage — 커뮤니티 콘텐츠 관리 (Pharmacy-Hub 운영자, audit #93)
 *
 * WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §3·§4
 *
 * 회원이 `/content` 에서 작성 → '검토 요청'(draft → pending) 을 누르면 이 콘솔이 받는다.
 * 검토 콘솔이 없으면 pending 이 영원히 게시되지 않는 dead flow 가 된다 — 회원 write 를
 * 여는 것과 **같은 변경에서** 처리 축을 함께 연다.
 *
 * 자료실 관리(`/operator/resources`)와 **같은 공통 console** 을 소비한다.
 * 두 축이 갈리는 지점은 원장 안의 `subType` 하나뿐이다:
 *   subType='resource' → 자료실 관리
 *   subType='content'  → 커뮤니티 콘텐츠 관리
 * 축마다 console 을 복제하지 않는다 — 문구는 lifecycle `nouns` config 로 주입한다
 * (공통 console 에 서비스 분기 0).
 *
 * 계약 (신규 table 0 / migration 0 / 신규 backend route 0 / 권한 모델 변경 0):
 *   GET/POST/PUT/PATCH `/api/v1/cms/contents` · serviceKey='pharmacy-hub' · type='knowledge'.
 */

import {
  OperatorResourcesConsolePage,
  CMS_CONTENTS_RESOURCES_LIFECYCLE,
  type ResourcesConsoleClient,
  type ResourcesConsoleItem,
  type ResourcesFormValue,
} from '@o4o/operator-core-ui/modules/resources';
import { RichTextEditor } from '@o4o/content-editor';
import {
  listPharmacyHubContentsForOperator,
  getPharmacyHubContent,
  createPharmacyHubContentAsOperator,
  updatePharmacyHubContent,
  setPharmacyHubContentStatus,
  type CmsContentItem,
} from '../../lib/api/pharmacyHubContents';

/** 회원 저작 여부를 그대로 드러낸다 — 운영자가 누가 쓴 글인지 알 수 있어야 한다. */
const AUTHOR_ROLE_LABEL: Record<string, string> = {
  community: '회원',
  service_admin: '운영자',
  admin: '관리자',
};

function toConsoleItem(row: CmsContentItem): ResourcesConsoleItem {
  const authorRole = row.authorRole ?? 'admin';
  return {
    id: row.id,
    title: row.title,
    summary: row.summary ?? null,
    status: row.status,
    // cms_contents 에는 source_type / usage_type 개념이 없다 (fieldCapabilities 가 끈다).
    source_type: 'manual',
    source_url: null,
    source_file_name: null,
    usage_type: null,
    created_by: row.createdBy ?? row.producerRef ?? null,
    author_name: AUTHOR_ROLE_LABEL[authorRole] ?? authorRole,
    created_at: row.createdAt,
    updated_at: row.publishedAt ?? row.createdAt,
  };
}

const toWriteInput = (input: ResourcesFormValue) => ({
  title: input.title,
  summary: input.summary,
  body: input.body,
});

const pharmacyHubCommunityContentsClient: ResourcesConsoleClient = {
  async operatorList(params) {
    const limit = params.limit ?? 20;
    const page = params.page ?? 1;
    const { items, total } = await listPharmacyHubContentsForOperator({
      limit,
      offset: (page - 1) * limit,
      search: params.search,
      status: params.status,
    });
    return { items: items.map(toConsoleItem), total };
  },
  operatorUpdateStatus(id, status) {
    return setPharmacyHubContentStatus(id, status);
  },
  async operatorGet(id) {
    const row = await getPharmacyHubContent(id);
    return { ...toConsoleItem(row), body: row.body ?? '' };
  },
  operatorCreate(input) {
    return createPharmacyHubContentAsOperator(toWriteInput(input));
  },
  operatorUpdate(id, input) {
    return updatePharmacyHubContent(id, toWriteInput(input));
  },
};

export default function CommunityContentsPage() {
  return (
    <OperatorResourcesConsolePage
      serviceKey="pharmacy-hub"
      client={pharmacyHubCommunityContentsClient}
      // 상세 링크는 회원 콘텐츠 상세 route 다 (자료실의 drawer deep-link 와 다르다).
      detailLinkPath={(id) => `/content/${id}`}
      lifecycle={{
        ...CMS_CONTENTS_RESOURCES_LIFECYCLE,
        nouns: {
          entity: '콘텐츠',
          collection: '커뮤니티 콘텐츠',
          consoleTitle: '커뮤니티 콘텐츠 관리',
        },
        form: {
          ...CMS_CONTENTS_RESOURCES_LIFECYCLE.form!,
          // cms_contents 회원 콘텐츠 축에는 외부 링크 필드를 쓰지 않는다.
          fields: { summary: true, body: true, link: false },
          RichTextEditor,
          createLabel: '콘텐츠 등록',
          createHint: '등록 직후 상태는 초안입니다. 검토 요청 → 게시 순으로 공개됩니다.',
        },
      }}
      policyBanner="회원이 검토 요청한 콘텐츠는 '검토 대기'로 들어옵니다. 게시 상태의 콘텐츠만 회원 화면에 노출되며, 삭제는 지원하지 않고 보관(archive) 처리로 대신합니다."
    />
  );
}
