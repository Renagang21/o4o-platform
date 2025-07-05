// Test page data types
export interface TestBanner {
  id: string;
  title: string;
  description: string;
  path: string;
  icon: string;
  category: 'feature' | 'utility';
  status: 'active' | 'coming_soon';
}

export interface TestAccount {
  id: string;
  role: string;
  username: string;
  password: string;
  description?: string;
}

export interface TestPageData {
  banners: TestBanner[];
  accounts: TestAccount[];
}