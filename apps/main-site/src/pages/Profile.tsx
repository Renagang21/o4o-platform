import React from 'react';

import { useAuth, UserRole } from '../context/AuthContext';


const Profile: React.FC = () => {

  const { user } = useAuth();


  if (!user) {

    return (

      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">

        <div className="text-center">

          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">

            로그인이 필요합니다

          </h2>

        </div>

      </div>

    );

  }


  return (

    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">

      <div className="max-w-3xl mx-auto">

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">

          <div className="px-4 py-5 sm:p-6">

            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">

              프로필 정보

            </h3>

            <div className="mt-5 border-t border-gray-200 dark:border-gray-700">

              <dl className="divide-y divide-gray-200 dark:divide-gray-700">

                <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4">

                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">

                    이름

                  </dt>

                  <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">

                    {user.name}

                  </dd>

                </div>

                <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4">

                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">

                    이메일

                  </dt>

                  <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">

                    {user.email}

                  </dd>

                </div>

                <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4">

                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">

                    역할

                  </dt>

                  <dd className="mt-1 text-sm text-gray-900 dark:text-white sm:mt-0 sm:col-span-2">

                    {user && user.roles.includes('admin' as UserRole)

                      ? '관리자'

                      : user && user.roles.includes('yaksa' as UserRole)

                      ? '약사'

                      : '일반 사용자'}

                  </dd>

                </div>

              </dl>

            </div>

          </div>

        </div>


        {user && user.roles.includes('yaksa' as UserRole) && (

          <div className="mt-8 bg-white dark:bg-gray-800 shadow rounded-lg">

            <div className="px-4 py-5 sm:p-6">

              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">

                약사 전용 메뉴

              </h3>

              <div className="mt-5">

                <a

                  href="/products/my"

                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"

                >

                  내 상품 관리

                </a>

              </div>

            </div>

          </div>

        )}


        {user && user.roles.includes('admin' as UserRole) && (

          <div className="mt-8 bg-white dark:bg-gray-800 shadow rounded-lg">

            <div className="px-4 py-5 sm:p-6">

              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">

                관리자 전용 메뉴

              </h3>

              <div className="mt-5">

                <a

                  href="/admin/approvals"

                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"

                >

                  약사 승인 관리

                </a>

              </div>

            </div>

          </div>

        )}

      </div>

    </div>

  );

};


export default Profile;

