import {
  OperatorLmsCoursesManager,
  type OperatorLmsCoursesListParams,
} from "@o4o/operator-core-ui";
import { authClient } from "@o4o/auth-client";
const base = "/lms/operator/courses";
const config = {
  disableHardDelete: true,
  detailPath: (id: string) =>
    `/operations/lecture/courses/${encodeURIComponent(id)}`,
  detailLinkLabel: "강의 검토",
  api: {
    list: async (params: OperatorLmsCoursesListParams) =>
      (
        await authClient.api.get(base, {
          params: { ...params, contentKind: "all" },
        })
      ).data,
    approve: async (id: string) =>
      (await authClient.api.post(`${base}/${encodeURIComponent(id)}/approve`))
        .data,
    reject: async (id: string, reason: string) =>
      (
        await authClient.api.post(`${base}/${encodeURIComponent(id)}/reject`, {
          reason,
        })
      ).data,
    unpublish: async (id: string) =>
      (await authClient.api.post(`${base}/${encodeURIComponent(id)}/unpublish`))
        .data,
    archive: async (id: string) =>
      (await authClient.api.post(`${base}/${encodeURIComponent(id)}/archive`))
        .data,
    hardDelete: async () => {
      throw new Error("중앙 일상 운영에서는 완전 삭제를 제공하지 않습니다.");
    },
  },
};
export default function CentralLectureCourses() {
  return <OperatorLmsCoursesManager config={config} />;
}
