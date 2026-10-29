export interface CategoryTreeItem {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  depth: number;
  sortOrder: number;
  isActive: boolean;
  isRegulated: boolean;
  children: CategoryTreeItem[];
}

export interface BrandItem {
  id: string;
  name: string;
  slug: string;
  manufacturerName: string | null;
  countryOfOrigin: string | null;
  isActive: boolean;
}
