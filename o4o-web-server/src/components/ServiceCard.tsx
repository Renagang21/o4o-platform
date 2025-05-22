import React from 'react';
import { Link } from 'react-router-dom';

interface ServiceCardProps {
  title: string;
  description: string;
  to: string;
  icon: string;
}

const ServiceCard: React.FC<ServiceCardProps> = ({ title, description, to, icon }) => (
  <Link to={to} className="block bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition p-6 text-center border hover:border-blue-500">
    <div className="text-4xl mb-2">{icon}</div>
    <div className="text-lg font-bold mb-1">{title}</div>
    <div className="text-gray-500 dark:text-gray-300 text-sm">{description}</div>
  </Link>
);

export default ServiceCard; 