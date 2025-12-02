import { FC, ReactNode } from 'react';
import { twMerge } from 'tailwind-merge';
import { Link } from 'react-router-dom';

interface BreadcrumbItem {
  label: ReactNode;
  href?: string;
  icon?: ReactNode;
  isCurrent?: boolean;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  separator?: ReactNode;
  className?: string;
}

const defaultSeparator = (
  <svg
    className="w-5 h-5 text-gray-400"
    fill="currentColor"
    viewBox="0 0 20 20"
  >
    <path
      fillRule="evenodd"
      d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
      clipRule="evenodd"
    />
  </svg>
);

const Breadcrumb: FC<BreadcrumbProps> = ({
  items,
  separator = defaultSeparator,
  className,
}) => {
  return (
    <nav
      className={twMerge('flex', className)}
      aria-label="Breadcrumb"
    >
      <ol className="flex items-center space-x-2">
        {items.map((item, index) => (
          <li key={index} className="flex items-center">
            {index > 0 && (
              <span className="mx-2" aria-hidden="true">
                {separator}
              </span>
            )}
            {item.isCurrent ? (
              <span
                className="text-sm font-medium text-gray-500"
                aria-current="page"
              >
                <div className="flex items-center space-x-2">
                  {item.icon && <span className="w-4 h-4">{item.icon}</span>}
                  <span>{item.label}</span>
                </div>
              </span>
            ) : item.href ? (
              <Link
                to={item.href}
                className="text-sm font-medium text-gray-500 hover:text-gray-700"
              >
                <div className="flex items-center space-x-2">
                  {item.icon && <span className="w-4 h-4">{item.icon}</span>}
                  <span>{item.label}</span>
                </div>
              </Link>
            ) : (
              <span className="text-sm font-medium text-gray-500">
                <div className="flex items-center space-x-2">
                  {item.icon && <span className="w-4 h-4">{item.icon}</span>}
                  <span>{item.label}</span>
                </div>
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};

export default Breadcrumb; 