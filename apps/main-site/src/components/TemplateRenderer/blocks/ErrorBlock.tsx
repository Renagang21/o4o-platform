import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ErrorBlockProps {
  blockType: string;
  blockData?: any;
  availableTypes: string[];
}

const ErrorBlock: FC<ErrorBlockProps> = ({ blockType, blockData, availableTypes }) => {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <div className="my-4 p-6 bg-red-50 border-2 border-red-200 rounded-lg">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-6 w-6 text-red-500 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h4 className="text-lg font-semibold text-red-800 mb-2">
            Unsupported Block Type: {blockType}
          </h4>
          
          {isDevelopment && (
            <>
              <p className="text-sm text-red-700 mb-3">
                This block type is not yet supported in the frontend renderer.
              </p>
              
              <details className="mb-3">
                <summary className="cursor-pointer text-sm font-medium text-red-700 hover:text-red-900">
                  View Block Data
                </summary>
                <pre className="mt-2 p-3 bg-red-100 rounded text-xs overflow-x-auto">
                  {JSON.stringify(blockData, null, 2)}
                </pre>
              </details>
              
              <details>
                <summary className="cursor-pointer text-sm font-medium text-red-700 hover:text-red-900">
                  Available Block Types ({availableTypes.length})
                </summary>
                <ul className="mt-2 text-sm text-red-600 list-disc list-inside">
                  {availableTypes.sort().map(type => (
                    <li key={type}>{type}</li>
                  ))}
                </ul>
              </details>
            </>
          )}
          
          {!isDevelopment && blockData?.text && (
            <p className="text-gray-700">{blockData.text}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorBlock;