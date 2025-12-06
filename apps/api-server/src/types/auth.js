// Authentication and Authorization Types
export var UserRole;
(function (UserRole) {
    UserRole["SUPER_ADMIN"] = "super_admin";
    UserRole["ADMIN"] = "admin";
    UserRole["VENDOR"] = "vendor";
    UserRole["SELLER"] = "seller";
    UserRole["USER"] = "user";
    UserRole["BUSINESS"] = "business";
    UserRole["PARTNER"] = "partner";
    // Dropshipping roles
    UserRole["SUPPLIER"] = "supplier";
    // Legacy roles kept for backward compatibility
    UserRole["MANAGER"] = "manager";
    UserRole["CUSTOMER"] = "customer"; // Deprecated: Use USER instead
})(UserRole || (UserRole = {}));
export var UserStatus;
(function (UserStatus) {
    UserStatus["ACTIVE"] = "active";
    UserStatus["INACTIVE"] = "inactive";
    UserStatus["PENDING"] = "pending";
    UserStatus["APPROVED"] = "approved";
    UserStatus["SUSPENDED"] = "suspended";
    UserStatus["REJECTED"] = "rejected";
})(UserStatus || (UserStatus = {}));
