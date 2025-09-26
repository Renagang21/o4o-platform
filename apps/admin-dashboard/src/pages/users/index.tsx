// import UsersListBulk from './UsersListBulk'; // Old complex version
// import UsersListClean from './UsersListClean'; // New clean WordPress-style
import UserListNew from './UserListNew'; // Unified clean version with UserApi

export default function UsersPage() {
  return <UserListNew />;
}