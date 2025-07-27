import { FC, ReactNode } from 'react';

interface AdminInputNoteProps {
  children: ReactNode;
}

export const AdminInputNote: FC<AdminInputNoteProps> = ({ children }) => {
  return <div className="text-sm text-gray-600 mt-1">{children}</div>;
};
