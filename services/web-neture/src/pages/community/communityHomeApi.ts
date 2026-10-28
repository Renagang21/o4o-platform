import { api } from "../../lib/apiClient";
import { createCommunityHomeApi } from "@o4o/operator-core-ui";
export {
  EDITORIAL_KINDS,
  SECTION_NAMES,
  SECTION_PATHS,
  newsSourceName,
  itemHref,
} from "@o4o/operator-core-ui";
export type {
  EditorialKind,
  HomeItem,
  HomePreview,
  CommunityHome,
  NewsReview,
  NewsCollection,
} from "@o4o/operator-core-ui";
export const homeApi = createCommunityHomeApi(api);
