"use strict";
// Authentication and Authorization Types
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserStatus = exports.UserRole = void 0;
var UserRole;
(function (UserRole) {
    UserRole["SUPER_ADMIN"] = "super_admin";
    UserRole["ADMIN"] = "admin";
    UserRole["VENDOR"] = "vendor";
    UserRole["SELLER"] = "seller";
    UserRole["CUSTOMER"] = "customer";
    UserRole["BUSINESS"] = "business";
    UserRole["MODERATOR"] = "moderator";
    UserRole["PARTNER"] = "partner";
    UserRole["BETA_USER"] = "beta_user";
    // Legacy roles kept for backward compatibility
    UserRole["SUPPLIER"] = "supplier";
    UserRole["MANAGER"] = "manager";
})(UserRole || (exports.UserRole = UserRole = {}));
var UserStatus;
(function (UserStatus) {
    UserStatus["ACTIVE"] = "active";
    UserStatus["INACTIVE"] = "inactive";
    UserStatus["PENDING"] = "pending";
    UserStatus["APPROVED"] = "approved";
    UserStatus["SUSPENDED"] = "suspended";
    UserStatus["REJECTED"] = "rejected";
})(UserStatus || (exports.UserStatus = UserStatus = {}));
//# sourceMappingURL=auth.js.map