import { useState, useContext, createContext, ReactNode } from 'react';

export type UserRole = 'user' | 'member' | 'contributor' | 'seller' | 'vendor' | 'partner' | 'operator' | 'administrator';

export interface UserRoleUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  roles: UserRole[];
}

interface UserRoleManagerContextType {
  users: UserRoleUser[];
  changeRoles: (id: string, newRoles: UserRole[]) => void;
  filter: UserRole | 'all';
  setFilter: (role: UserRole | 'all') => void;
  search: string;
  setSearch: (search: string) => void;
  adminId: string;
}

const UserRoleManagerContext = createContext<UserRoleManagerContextType | undefined>(undefined);

const initialUsers: UserRoleUser[] = [
  { id: '1', name: '최고관리자', email: 'admin@neture.co.kr', phone: '010-1111-1111', roles: ['administrator', 'operator'] },
  { id: '2', name: '운영자', email: 'operator@neture.co.kr', phone: '010-2222-2222', roles: ['operator'] },
  { id: '3', name: '판매자', email: 'seller@neture.co.kr', phone: '010-3333-3333', roles: ['seller'] },
  { id: '4', name: '공급자', email: 'vendor@neture.co.kr', phone: '010-4444-4444', roles: ['vendor'] },
  { id: '5', name: '제휴사', email: 'partner@neture.co.kr', phone: '010-5555-5555', roles: ['partner'] },
  { id: '6', name: '콘텐츠기여자', email: 'contributor@neture.co.kr', phone: '010-6666-6666', roles: ['contributor'] },
  { id: '7', name: '일반회원', email: 'member@neture.co.kr', phone: '010-7777-7777', roles: ['member'] },
  { id: '8', name: '방문자', email: 'user@neture.co.kr', phone: '010-8888-8888', roles: ['user'] },
];

export const UserRoleManagerProvider = ({ children }: { children: ReactNode }) => {
  const [users, setUsers] = useState(initialUsers);
  const [filter, setFilter] = useState<UserRole | 'all'>('all');
  const [search, setSearch] = useState('');
  const adminId = '1'; // 관리자 본인 ID (mock)

  const changeRoles = (id: string, newRoles: UserRole[]) => {
    setUsers(users => users.map(u => u.id === id ? { ...u, roles: newRoles } : u));
  };

  return (
    <UserRoleManagerContext.Provider value={{ users, changeRoles, filter, setFilter, search, setSearch, adminId }}>
      {children}
    </UserRoleManagerContext.Provider>
  );
};

export const useUserRoleManager = () => {
  const ctx = useContext(UserRoleManagerContext);
  if (!ctx) throw new Error('useUserRoleManager must be used within UserRoleManagerProvider');
  return ctx;
}; 