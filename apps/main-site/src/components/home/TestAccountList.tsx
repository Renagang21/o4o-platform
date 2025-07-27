import { useState, FC } from 'react';
import { TestAccount } from '../../types/testData';
import Card from '../common/Card';
import List from '../common/List';
import Button from '../common/Button';

interface TestAccountListProps {
  accounts: TestAccount[];
  title?: string;
  description?: string;
}

const TestAccountList: React.FC<TestAccountListProps> = ({ 
  accounts,
  title = '테스트 계정 정보',
  description = '각 역할에 맞는 계정으로 로그인하여 기능을 테스트하세요' 
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, accountId: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(accountId);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const listItems = accounts.map((account) => ({
    id: account.id,
    content: (
      <div className="flex flex-col space-y-1">
        <div className="flex items-center space-x-2">
          <span className="font-medium text-gray-900">{account.role}</span>
          <span className="text-sm text-gray-500">({account.description})</span>
        </div>
        <div className="flex items-center space-x-4 text-sm">
          <span className="text-gray-600">
            ID: <code className="bg-gray-100 px-2 py-1 rounded">{account.username}</code>
          </span>
          <span className="text-gray-600">
            PW: <code className="bg-gray-100 px-2 py-1 rounded">{account.password}</code>
          </span>
        </div>
      </div>
    ),
    action: (
      <div className="flex space-x-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => copyToClipboard(account.username, `${account.id}-username`)}
        >
          {copiedId === `${account.id}-username` ? '복사됨!' : 'ID 복사'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => copyToClipboard(account.password, `${account.id}-password`)}
        >
          {copiedId === `${account.id}-password` ? '복사됨!' : 'PW 복사'}
        </Button>
      </div>
    )
  }));

  return (
    <section className="py-16 bg-white">
      <div className="max-w-[1200px] mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-light text-gray-900 mb-4 tracking-tight">
              {title}
            </h2>
            <p className="text-lg text-gray-600 font-light">
              {description}
            </p>
          </div>

          <Card variant="elevated" className="p-6">
            <div className="mb-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">테스트 환경 안내</h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <p>• 모든 테스트 계정은 초기화되어 있습니다</p>
                      <p>• 로그인 후 각 역할에 맞는 기능을 테스트할 수 있습니다</p>
                      <p>• 테스트 데이터는 매일 새벽 초기화됩니다</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <List
              items={listItems}
              variant="bordered"
              size="md"
            />
          </Card>
        </div>
      </div>
    </section>
  );
};

export default TestAccountList;