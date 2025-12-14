/**
 * Product Info Create Page
 *
 * Create new product content
 * Phase R10: Supplier Publishing UI
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Package, ArrowLeft, Save, Globe } from 'lucide-react';
import { AGTabs, type AGTab } from '@/components/ag/AGTabs';
import { productContentApi, type CreateProductContentDto, type TargetAudience } from '@/lib/api/lmsMarketing';
import { useAuth } from '@o4o/auth-context';

const TARGET_OPTIONS = [
  { value: 'seller', label: 'Sellers' },
  { value: 'consumer', label: 'Consumers' },
  { value: 'pharmacist', label: 'Pharmacists' },
  { value: 'all', label: 'All Users' },
] as const;

export default function ProductCreatePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const supplierId = user?.supplierId || user?.id || 'default-supplier';

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

  const handleSubmit = async (publish = false) => {
    if (!formData.title.trim()) {
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

    const dto: CreateProductContentDto = {
      supplierId,
      title: formData.title,
      description: formData.description || undefined,
      bundleId: formData.bundleId || undefined,
      targeting,
    };

    try {
      const response = await productContentApi.create(dto);
      if (response.success && response.data) {
        if (publish) {
          await productContentApi.publish(response.data.id);
        }
        navigate('/admin/marketing/publisher/product');
      } else {
        setError(response.error || 'Failed to create product content');
      }
    } catch (err) {
      setError('Failed to create product content');
      console.error('Create error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

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
            <p className="text-xs text-muted-foreground">
              Link this product info to an LMS content bundle for educational materials
            </p>
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
            <p className="text-xs text-muted-foreground">
              Leave empty to target all regions
            </p>
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
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6 text-blue-500" />
            Create Product Info
          </h1>
          <p className="text-muted-foreground">
            Add educational content for your products
          </p>
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
            Fill in the information below to create new product content
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AGTabs tabs={tabs} defaultTab="basic" />

          {/* Actions */}
          <div className="flex justify-end gap-4 mt-8 pt-6 border-t">
            <Button
              variant="outline"
              onClick={() => navigate('/admin/marketing/publisher/product')}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleSubmit(false)}
              disabled={isSubmitting}
            >
              <Save className="h-4 w-4 mr-2" />
              Save as Draft
            </Button>
            <Button
              onClick={() => handleSubmit(true)}
              disabled={isSubmitting}
            >
              <Globe className="h-4 w-4 mr-2" />
              Save & Publish
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
