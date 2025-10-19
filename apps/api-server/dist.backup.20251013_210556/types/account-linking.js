"use strict";
// Account Linking Types
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountLinkingError = exports.LinkingStatus = void 0;
// Account linking status
var LinkingStatus;
(function (LinkingStatus) {
    LinkingStatus["PENDING"] = "pending";
    LinkingStatus["VERIFIED"] = "verified";
    LinkingStatus["FAILED"] = "failed";
})(LinkingStatus || (exports.LinkingStatus = LinkingStatus = {}));
// Error codes for account linking
var AccountLinkingError;
(function (AccountLinkingError) {
    AccountLinkingError["ALREADY_LINKED"] = "ALREADY_LINKED";
    AccountLinkingError["ACCOUNT_NOT_FOUND"] = "ACCOUNT_NOT_FOUND";
    AccountLinkingError["PROVIDER_ERROR"] = "PROVIDER_ERROR";
    AccountLinkingError["VERIFICATION_REQUIRED"] = "VERIFICATION_REQUIRED";
    AccountLinkingError["INVALID_CREDENTIALS"] = "INVALID_CREDENTIALS";
    AccountLinkingError["MERGE_CONFLICT"] = "MERGE_CONFLICT";
    AccountLinkingError["SECURITY_VERIFICATION_FAILED"] = "SECURITY_VERIFICATION_FAILED";
    AccountLinkingError["SESSION_EXPIRED"] = "SESSION_EXPIRED";
    AccountLinkingError["INVALID_PROVIDER"] = "INVALID_PROVIDER";
    AccountLinkingError["LAST_PROVIDER"] = "LAST_PROVIDER"; // Cannot unlink the last authentication method
})(AccountLinkingError || (exports.AccountLinkingError = AccountLinkingError = {}));
//# sourceMappingURL=account-linking.js.map