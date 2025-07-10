import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Routes, Route } from 'react-router-dom';
import AllUsers from './AllUsers';
import PendingApproval from './PendingApproval';
import UserDetail from './UserDetail';
import AddUser from './AddUser';
import Roles from './Roles';
const Users = () => {
    return (_jsxs(Routes, { children: [_jsx(Route, { index: true, element: _jsx(AllUsers, {}) }), _jsx(Route, { path: "pending", element: _jsx(PendingApproval, {}) }), _jsx(Route, { path: "business", element: _jsx(AllUsers, {}) }), _jsx(Route, { path: "affiliates", element: _jsx(AllUsers, {}) }), _jsx(Route, { path: "add", element: _jsx(AddUser, {}) }), _jsx(Route, { path: "roles", element: _jsx(Roles, {}) }), _jsx(Route, { path: ":userId", element: _jsx(UserDetail, {}) }), _jsx(Route, { path: ":userId/edit", element: _jsx(AddUser, {}) })] }));
};
export default Users;
//# sourceMappingURL=Users.js.map