import { FC } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import EmailSettings from '../settings/EmailSettings';
import EmailTemplates from './EmailTemplates';
import EmailLogs from './EmailLogs';

const MailManagement: FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/mail/smtp" replace />} />
      <Route path="/smtp" element={<EmailSettings />} />
      <Route path="/templates" element={<EmailTemplates />} />
      <Route path="/logs" element={<EmailLogs />} />
    </Routes>
  );
};

export default MailManagement;