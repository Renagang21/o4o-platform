/**
 * Supplier Profile Form
 *
 * Form for editing supplier profile during onboarding
 * Phase R11: Supplier Onboarding System
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Save, Building } from 'lucide-react';
import { onboardingApi, type SupplierProfile } from '@/lib/api/lmsMarketing';
import { useAuth } from '@o4o/auth-context';

export default function SupplierProfileForm() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<SupplierProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    brandName: '',
    contactEmail: '',
    contactPhone: '',
    region: '',
    categories: '',
    productTypes: '',
  });

  const supplierId = user?.supplierId || user?.id || 'default-supplier';

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      try {
        const response = await onboardingApi.getProfile(supplierId);
        if (response.success && response.data) {
          const p = response.data;
          setProfile(p);
          setFormData({
            brandName: p.brandName || '',
            contactEmail: p.contactEmail || '',
            contactPhone: p.contactPhone || '',
            region: p.region || '',
            categories: p.categories.join(', '),
            productTypes: p.productTypes.join(', '),
          });
        }
      } catch (err) {
        setError('Failed to load profile');
        console.error('Profile fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [supplierId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await onboardingApi.updateProfile({
        supplierId,
        brandName: formData.brandName || undefined,
        contactEmail: formData.contactEmail || undefined,
        contactPhone: formData.contactPhone || undefined,
        region: formData.region || undefined,
        categories: formData.categories
          ? formData.categories.split(',').map((c) => c.trim()).filter(Boolean)
          : [],
        productTypes: formData.productTypes
          ? formData.productTypes.split(',').map((t) => t.trim()).filter(Boolean)
          : [],
      });

      if (response.success && response.data) {
        setProfile(response.data);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(response.error || 'Failed to update profile');
      }
    } catch (err) {
      setError('Failed to update profile');
      console.error('Profile update error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building className="h-6 w-6 text-primary" />
            Supplier Profile
          </h1>
          <p className="text-muted-foreground">
            Update your brand information
          </p>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="bg-green-50 border-green-200">
          <AlertDescription className="text-green-700">
            Profile updated successfully!
          </AlertDescription>
        </Alert>
      )}

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Brand Information</CardTitle>
          <CardDescription>
            This information will be used for your marketing campaigns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="brandName">Brand Name *</Label>
                <Input
                  id="brandName"
                  value={formData.brandName}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, brandName: e.target.value }))
                  }
                  placeholder="Your brand name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="region">Region</Label>
                <Input
                  id="region"
                  value={formData.region}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, region: e.target.value }))
                  }
                  placeholder="e.g., Seoul, Busan"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Contact Email *</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, contactEmail: e.target.value }))
                  }
                  placeholder="contact@yourbrand.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactPhone">Contact Phone</Label>
                <Input
                  id="contactPhone"
                  value={formData.contactPhone}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, contactPhone: e.target.value }))
                  }
                  placeholder="010-1234-5678"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="categories">Product Categories</Label>
              <Input
                id="categories"
                value={formData.categories}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, categories: e.target.value }))
                }
                placeholder="Cosmetics, Skincare, Health (comma-separated)"
              />
              <p className="text-xs text-muted-foreground">
                Enter categories separated by commas
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="productTypes">Product Types</Label>
              <Input
                id="productTypes"
                value={formData.productTypes}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, productTypes: e.target.value }))
                }
                placeholder="Cream, Serum, Mask (comma-separated)"
              />
              <p className="text-xs text-muted-foreground">
                Enter product types separated by commas
              </p>
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/admin/marketing/onboarding')}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Profile'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
