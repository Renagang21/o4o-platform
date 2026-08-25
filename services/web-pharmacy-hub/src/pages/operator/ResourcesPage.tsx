/**
 * ResourcesPage — 자료실 관리 (Pharmacy-Hub 운영자)
 *
 * WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §3·§4
 *
 * 이전 판정 `ADOPTED_SERVICE_SPECIFIC`(PH 전용 console) 을 폐기하고 **공통 console 채택**으로
 * 재정렬한다. 원장 차이(cms_contents vs {service}_contents)는 서비스 분기가 아니라
 * `ResourcesLifecycleConfig` 로 표현한다 — `CMS_CONTENTS_RESOURCES_LIFECYCLE`.
 *
 * 계약 (신규 table 0 / migration 0 / 신규 backend route 0 / 권한 모델 변경 0):
 *   GET/POST/PUT/PATCH `/api/v1/cms/contents` · serviceKey='pharmacy-hub' · type='knowledge'.
 *   `pharmacy-hub:operator|admin` 은 authorizeCmsMutation 이 이미 인가한다.
 *
 * 상태 전이는 서버(CMS_ALLOWED_TRANSITIONS)가 정본이고 lifecycle config 가 그것을 그대로
 * 미러링한다 — 400 을 유발하는 버튼을 만들지 않는다. delete 는 API 자체가 없으므로
 * `supportsDelete: false` 로 CTA 를 그리지 않는다.
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
  listPharmacyHubResourcesForOperator,
  getPharmacyHubResource,
  createPharmacyHubResource,
  updatePharmacyHubResource,
  setPharmacyHubResourceStatus,
  type CmsContentItem,
} from '../../lib/api/pharmacyHubResources';

/** cms_contents row → 공통 console row. 원장 차이를 adapter 에서 흡수한다. */
function toConsoleItem(row: CmsContentItem): ResourcesConsoleItem {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary ?? null,
    status: row.status,
    // cms_contents 에는 source_type / usage_type 개념이 없다.
    // lifecycle.fieldCapabilities 가 두 컬럼을 끄므로 화면에 그려지지 않는다.
    source_type: 'manual',
    source_url: row.linkUrl ?? null,
    source_file_name: null,
    usage_type: null,
    created_by: row.authorRole ?? null,
    author_name: row.authorRole ?? null,
    created_at: row.createdAt,
    updated_at: row.publishedAt ?? row.createdAt,
  };
}

const toWriteInput = (input: ResourcesFormValue) => ({
  title: input.title,
  summary: input.summary,
  body: input.body,
  linkUrl: input.linkUrl,
  linkText: input.linkText,
});

const pharmacyHubResourcesConsoleClient: ResourcesConsoleClient = {
  async operatorList(params) {
    const limit = params.limit ?? 20;
    const page = params.page ?? 1;
    const { items, total } = await listPharmacyHubResourcesForOperator({
      limit,
      offset: (page - 1) * limit,
      search: params.search,
      status: params.status,
    });
    return { items: items.map(toConsoleItem), total };
  },
  operatorUpdateStatus(id, status) {
    return setPharmacyHubResourceStatus(id, status);
  },
  async operatorGet(id) {
    const row = await getPharmacyHubResource(id);
    return { ...toConsoleItem(row), body: row.body ?? '', linkText: row.linkText ?? '' };
  },
  operatorCreate(input) {
    return createPharmacyHubResource(toWriteInput(input));
  },
  operatorUpdate(id, input) {
    return updatePharmacyHubResource(id, toWriteInput(input));
  },
};

export default function ResourcesPage() {
  return (
    <OperatorResourcesConsolePage
      serviceKey="pharmacy-hub"
      client={pharmacyHubResourcesConsoleClient}
      lifecycle={{
        ...CMS_CONTENTS_RESOURCES_LIFECYCLE,
        form: { ...CMS_CONTENTS_RESOURCES_LIFECYCLE.form!, RichTextEditor },
      }}
      policyBanner="게시 상태의 자료만 회원 자료실에 노출됩니다. 삭제는 지원하지 않으며 보관(archive) 처리로 대신합니다."
    />
  );
}
