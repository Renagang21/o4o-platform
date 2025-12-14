/**
 * Product Info Edit Page
 *
 * Edit existing product content
 * Phase R10: Supplier Publishing UI
 */

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Package, ArrowLeft, Save, Globe, GlobeLock, ExternalLink } from 'lucide-react';
import { AGTabs, type AGTab } from '@/components/ag/AGTabs';
import { productContentApi, type UpdateProductContentDto, type ProductContent, type TargetAudience } from '@/lib/api/lmsMarketing';

const TARGET_OPTIONS = [
  { value: 'seller', label: 'Sellers' },
  { value: 'consumer', label: 'Consumers' },
  { value: 'pharmacist', label: 'Pharmacists' },
  { value: 'all', label: 'All Users' },
] as const;

export default function ProductEditPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [product, setProduct] = useState<ProductContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    bundleId: '',
    targets: ['all'] as string[],
    regions: '',
    tags: '',
    sellerTypes: '',
  });

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      setIsLoading(true);
      try {
        const response = await productContentApi.get(id);
        if (response.success && response.data) {
          const p = response.data;
          setProduct(p);
          setFormData({
            title: p.title,
            description: p.description || '',
            bundleId: p.bundleId || '',
            targets: p.targeting.targets || ['all'],
            regions: p.targeting.regions?.join(', ') || '',
            tags: p.targeting.tags?.join(', ') || '',
            sellerTypes: p.targeting.sellerTypes?.join(', ') || '',
          });
        } else {
          setError(response.error || 'Failed to load product');
        }
      } catch (err) {
        setError('Failed to load product');
        console.error('Fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  const handleTargetChange = (target: string, checked: boolean) => {
    setFormData((prev) => {
      let newTargets = [...prev.targets];
      if (checked) {
        if (target === 'all') {
          newTargets = ['all'];
        } else {
          newTargets = newTargets.filter((t) => t !== 'all');
          newTargets.push(target);
        }
      } else {
        newTargets = newTargets.filter((t) => t !== target);
        if (newTargets.length === 0) {
          newTargets = ['all'];
        }
      }
      return { ...prev, targets: newTargets };
    });
  };

  const handleSubmit = async () => {
    if (!id || !formData.title.trim()) {
      setError('Title is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const targeting: TargetAudience = {
      targets: formData.targets as TargetAudience['targets'],
      regions: formData.regions ? formData.regions.split(',').map((r) => r.trim()) : undefined,
      tags: formData.tags ? formData.tags.split(',').map((t) => t.trim()) : undefined,
      sellerTypes: formData.sellerTypes ? formData.sellerTypes.split(',').map((s) => s.trim()) : undefined,
    };

    const dto: UpdateProductContentDto = {
      title: formData.title,
      description: formData.description || undefined,
      bundleId: formData.bundleId || undefined,
      targeting,
    };

    try {
      const response = await productContentApi.update(id, dto);
      if (response.success) {
        navigate('/admin/marketing/publisher/product');
      } else {
        setError(response.error || 'Failed to update product content');
      }
    } catch (err) {
      setError('Failed to update product content');
      console.error('Update error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePublish = async () => {
    if (!id) return;
    setIsSubmitting(true);
    try {
      const response = await productContentApi.publish(id);
      if (response.success && response.data) {
        setProduct(response.data);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnpublish = async () => {
    if (!id) return;
    setIsSubmitting(true);
    try {
      const response = await productContentApi.unpublish(id);
      if (response.success && response.data) {
        setProduct(response.data);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertDescription>Product not found</AlertDescription>
        </Alert>
      </div>
    );
  }

  const tabs: AGTab[] = [
    {
      id: 'basic',
      label: 'Basic Info',
      content: (
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Enter product content title"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Enter a description of this content"
              rows={4}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bundleId">Content Bundle ID</Label>
            <Input
              id="bundleId"
              value={formData.bundleId}
              onChange={(e) => setFormData((prev) => ({ ...prev, bundleId: e.target.value }))}
              placeholder="Link to a content bundle (optional)"
            />
          </div>
        </div>
      ),
    },
    {
      id: 'targeting',
      label: 'Targeting',
      content: (
        <div className="space-y-6 pt-4">
          <div className="space-y-4">
            <Label>Target Audience</Label>
            <div className="grid grid-cols-2 gap-4">
              {TARGET_OPTIONS.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`target-${option.value}`}
                    checked={formData.targets.includes(option.value)}
                    onCheckedChange={(checked) =>
                      handleTargetChange(option.value, checked as boolean)
                    }
                  />
                  <Label htmlFor={`target-${option.value}`} className="font-normal">
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="regions">Target Regions</Label>
            <Input
              id="regions"
              value={formData.regions}
              onChange={(e) => setFormData((prev) => ({ ...prev, regions: e.target.value }))}
              placeholder="Seoul, Busan, Daegu (comma-separated)"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              value={formData.tags}
              onChange={(e) => setFormData((prev) => ({ ...prev, tags: e.target.value }))}
              placeholder="skincare, vitamin, new-product (comma-separated)"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sellerTypes">Seller Types</Label>
            <Input
              id="sellerTypes"
              value={formData.sellerTypes}
              onChange={(e) => setFormData((prev) => ({ ...prev, sellerTypes: e.target.value }))}
              placeholder="pharmacy, clinic, retail (comma-separated)"
            />
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Package className="h-6 w-6 text-blue-500" />
              Edit Product Info
            </h1>
            <p className="text-muted-foreground">
              Update your product content
            </p>
          </div>
        </div>
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
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Product Content Details</CardTitle>
          <CardDescription>
            Update the information below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AGTabs tabs={tabs} defaultTab="basic" />

          {/* Actions */}
          <div className="flex justify-between mt-8 pt-6 border-t">
            <div className="flex gap-2">
              {product.isPublished ? (
                <Button
                  variant="outline"
                  onClick={handleUnpublish}
                  disabled={isSubmitting}
                >
                  <GlobeLock className="h-4 w-4 mr-2" />
                  Unpublish
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={handlePublish}
                  disabled={isSubmitting}
                >
                  <Globe className="h-4 w-4 mr-2" />
                  Publish
                </Button>
              )}
              <Button variant="ghost" asChild>
                <a
                  href={`/marketing/product/${product.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Preview
                </a>
              </Button>
            </div>
            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => navigate('/admin/marketing/publisher/product')}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
