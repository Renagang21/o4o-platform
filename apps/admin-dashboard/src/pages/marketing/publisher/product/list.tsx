/**
 * Product Info List Page
 *
 * List all product content for the supplier
 * Phase R10: Supplier Publishing UI
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Plus,
  AlertTriangle,
  Package,
  Eye,
  Edit,
  Trash2,
  Globe,
  GlobeLock,
} from 'lucide-react';
import { AGTable, type AGTableColumn } from '@/components/ag/AGTable';
import { AGModal } from '@/components/ag/AGModal';
import { productContentApi, type ProductContent } from '@/lib/api/lmsMarketing';
import { useAuth } from '@o4o/auth-context';

export default function ProductListPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<ProductContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; product: ProductContent | null }>({
    open: false,
    product: null,
  });

  const supplierId = user?.supplierId || user?.id || 'default-supplier';

  const fetchProducts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await productContentApi.list(supplierId);
      if (response.success && response.data) {
        setProducts(response.data.data || []);
      } else {
        setError(response.error || 'Failed to load products');
      }
    } catch (err) {
      setError('Failed to load products');
      console.error('Product fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [supplierId]);

  const handlePublish = async (id: string) => {
    const response = await productContentApi.publish(id);
    if (response.success) {
      fetchProducts();
    }
  };

  const handleUnpublish = async (id: string) => {
    const response = await productContentApi.unpublish(id);
    if (response.success) {
      fetchProducts();
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.product) return;
    const response = await productContentApi.delete(deleteModal.product.id);
    if (response.success) {
      setDeleteModal({ open: false, product: null });
      fetchProducts();
    }
  };

  const columns: AGTableColumn<ProductContent>[] = [
    {
      key: 'title',
      header: 'Title',
      sortable: true,
      render: (product) => (
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-blue-500" />
          <span className="font-medium">{product.title}</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (product) => (
        <div className="flex items-center gap-2">
          {product.isPublished ? (
            <Badge variant="default" className="bg-green-500">
              <Globe className="h-3 w-3 mr-1" />
              Published
            </Badge>
          ) : (
            <Badge variant="secondary">
              <GlobeLock className="h-3 w-3 mr-1" />
              Draft
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: 'targeting',
      header: 'Targeting',
      render: (product) => (
        <div className="flex gap-1 flex-wrap">
          {product.targeting.targets.map((target) => (
            <Badge key={target} variant="outline" className="text-xs">
              {target}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      render: (product) => (
        <span className="text-sm text-muted-foreground">
          {new Date(product.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (product) => (
        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="ghost">
            <Link to={`/admin/marketing/publisher/product/${product.id}`}>
              <Edit className="h-4 w-4" />
            </Link>
          </Button>
          {product.isPublished ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleUnpublish(product.id)}
            >
              <GlobeLock className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handlePublish(product.id)}
            >
              <Globe className="h-4 w-4" />
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="text-red-500 hover:text-red-600"
            onClick={() => setDeleteModal({ open: true, product })}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6 text-blue-500" />
            Product Info
          </h1>
          <p className="text-muted-foreground">
            Manage educational content for your products
          </p>
        </div>
        <Button asChild>
          <Link to="/admin/marketing/publisher/product/create">
            <Plus className="h-4 w-4 mr-2" />
            Create Product Info
          </Link>
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Product Content</CardTitle>
          <CardDescription>
            {products.length} product{products.length !== 1 ? 's' : ''} total
          </CardDescription>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No product content yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first product info content to get started
              </p>
              <Button asChild>
                <Link to="/admin/marketing/publisher/product/create">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Product Info
                </Link>
              </Button>
            </div>
          ) : (
            <AGTable
              data={products}
              columns={columns}
              keyField="id"
            />
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      <AGModal
        open={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, product: null })}
        title="Delete Product Content"
        description={`Are you sure you want to delete "${deleteModal.product?.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
