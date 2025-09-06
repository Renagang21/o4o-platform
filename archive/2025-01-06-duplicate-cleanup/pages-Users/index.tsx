import UserStatistics from './components/UserStatistics';
import UserList from './UserList';

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <UserStatistics />
      <UserList />
    </div>
  );
}