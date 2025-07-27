import { useState, useContext, createContext, ReactNode } from 'react';

export interface ApprovalUser {
  id: string;
  name: string;
  email: string;
  licenseNumber: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  phoneNumber?: string;
  address?: string;
  rejectionReason?: string;
}

interface ApprovalContextType {
  users: ApprovalUser[];
  approveUser: (id: string) => void;
  rejectUser: (id: string, reason: string) => void;
  getUserById: (id: string) => ApprovalUser | undefined;
  filter: string;
  setFilter: (filter: string) => void;
  search: string;
  setSearch: (search: string) => void;
}

const ApprovalContext = createContext<ApprovalContextType | undefined>(undefined);

const initialUsers: ApprovalUser[] = [
  {
    id: '1',
    name: '김약사',
    email: 'pharmacist1@example.com',
    licenseNumber: '12345',
    status: 'pending',
    createdAt: '2024-03-15T10:00:00Z',
    phoneNumber: '010-1234-5678',
    address: '서울시 강남구',
  },
  {
    id: '2',
    name: '이약사',
    email: 'pharmacist2@example.com',
    licenseNumber: '67890',
    status: 'pending',
    createdAt: '2024-03-15T11:30:00Z',
    phoneNumber: '010-5678-1234',
    address: '부산시 해운대구',
  },
];

export const ApprovalProvider = ({ children }: { children: ReactNode }) => {
  const [users, setUsers] = useState<ApprovalUser[]>(initialUsers);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  const approveUser = (id: string) => {
    setUsers(users => users.map(u => u.id === id ? { ...u, status: 'approved' } : u));
  };
  const rejectUser = (id: string, reason: string) => {
    setUsers(users => users.map(u => u.id === id ? { ...u, status: 'rejected', rejectionReason: reason } : u));
  };
  const getUserById = (id: string) => users.find(u => u.id === id);

  return (
    <ApprovalContext.Provider value={{ users, approveUser, rejectUser, getUserById, filter, setFilter, search, setSearch }}>
      {children}
    </ApprovalContext.Provider>
  );
};

export const useApproval = () => {
  const ctx = useContext(ApprovalContext);
  if (!ctx) throw new Error('useApproval must be used within ApprovalProvider');
  return ctx;
}; 