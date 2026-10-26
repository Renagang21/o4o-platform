import { createAuthenticatedJsonRequest } from "@o4o/store-ui-core/api/transport";
import { getAccessToken } from "../contexts/AuthContext";
import { tryRefreshToken } from "./token-refresh";

export const storeJsonFetch = createAuthenticatedJsonRequest({
  getAccessToken,
  tryRefreshToken,
});
