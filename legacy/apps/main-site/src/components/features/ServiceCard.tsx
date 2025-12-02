import { FC, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

interface ServiceCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  link: string;
}

const ServiceCard: FC<ServiceCardProps> = ({ title, description, icon, link }) => {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(link)}
      className="flex flex-col items-center justify-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition cursor-pointer w-full h-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <div className="mb-3 text-blue-600 dark:text-blue-400 text-3xl">{icon}</div>
      <div className="font-bold text-lg text-gray-900 dark:text-white mb-1">{title}</div>
      <div className="text-gray-600 dark:text-gray-300 text-sm text-center">{description}</div>
    </button>
  );
};

export default ServiceCard; 