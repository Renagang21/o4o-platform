import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle
} from 'lucide-react';

interface RoleVerificationProps {
  type: 'supplier' | 'seller' | 'affiliate';
}

const RoleVerification: React.FC<RoleVerificationProps> = ({ type }) => {
  useAuth();
  const [loading, setLoading] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<string>('pending');
  const [formData, setFormData] = useState<any>({});
  const [documents, setDocuments] = useState<any>({});
  const [errors, setErrors] = useState<any>({});

  useEffect(() => {
    fetchVerificationStatus();
  }, [type]);

  const fetchVerificationStatus = async () => {
    try {
      const response = await fetch(`/api/v1/dropshipping/verification/${type}/status`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setVerificationStatus(data.status);
        setFormData(data.formData || {});
      }
    } catch (error) {
      // Error log removed
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
    setErrors({ ...errors, [field]: null });
  };

  const handleFileUpload = async (field: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', field);

    try {
      const response = await fetch('/api/v1/dropshipping/upload-document', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        setDocuments({ ...documents, [field]: data.url });
      }
    } catch (error) {
      // Error log removed
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/dropshipping/verification/${type}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ ...formData, documents })
      });

      if (response.ok) {
        setVerificationStatus('pending');
        alert('Verification request submitted successfully!');
      } else {
        const error = await response.json();
        setErrors(error.errors || {});
      }
    } catch (error) {
      // Error log removed
    } finally {
      setLoading(false);
    }
  };

  // Supplier Verification Form
  const SupplierVerificationForm = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="companyName">Company Name *</Label>
          <Input
            id="companyName"
            value={formData.companyName || ''}
            onChange={(e) => handleInputChange('companyName', e.target.value)}
            placeholder="Enter your company name"
          />
          {errors.companyName && <p className="text-sm text-red-500">{errors.companyName}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="businessNumber">Business Registration Number *</Label>
          <Input
            id="businessNumber"
            value={formData.businessNumber || ''}
            onChange={(e) => handleInputChange('businessNumber', e.target.value)}
            placeholder="Enter business registration number"
          />
          {errors.businessNumber && <p className="text-sm text-red-500">{errors.businessNumber}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="contactPerson">Contact Person *</Label>
          <Input
            id="contactPerson"
            value={formData.contactPerson || ''}
            onChange={(e) => handleInputChange('contactPerson', e.target.value)}
            placeholder="Full name of contact person"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="contactEmail">Business Email *</Label>
          <Input
            id="contactEmail"
            type="email"
            value={formData.contactEmail || ''}
            onChange={(e) => handleInputChange('contactEmail', e.target.value)}
            placeholder="business@example.com"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="contactPhone">Business Phone *</Label>
          <Input
            id="contactPhone"
            value={formData.contactPhone || ''}
            onChange={(e) => handleInputChange('contactPhone', e.target.value)}
            placeholder="+1 234 567 8900"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="website">Company Website</Label>
          <Input
            id="website"
            value={formData.website || ''}
            onChange={(e) => handleInputChange('website', e.target.value)}
            placeholder="https://www.example.com"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Business Address *</Label>
        <Textarea
          id="address"
          value={formData.address || ''}
          onChange={(e) => handleInputChange('address', e.target.value)}
          placeholder="Enter complete business address"
          rows={3}
        />
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Required Documents</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Business License *</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload('businessLicense', e.target.files[0])}
                />
                {documents.businessLicense && (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Online Selling License</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload('onlineSellingLicense', e.target.files[0])}
                />
                {documents.onlineSellingLicense && (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Bank Account Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="bankName">Bank Name</Label>
            <Input
              id="bankName"
              value={formData.bankName || ''}
              onChange={(e) => handleInputChange('bankName', e.target.value)}
              placeholder="Bank name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="accountNumber">Account Number</Label>
            <Input
              id="accountNumber"
              value={formData.accountNumber || ''}
              onChange={(e) => handleInputChange('accountNumber', e.target.value)}
              placeholder="Account number"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="accountHolder">Account Holder Name</Label>
            <Input
              id="accountHolder"
              value={formData.accountHolder || ''}
              onChange={(e) => handleInputChange('accountHolder', e.target.value)}
              placeholder="Account holder name"
            />
          </div>
        </div>
      </div>
    </div>
  );

  // Seller Verification Form
  const SellerVerificationForm = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="storeName">Store Name *</Label>
          <Input
            id="storeName"
            value={formData.storeName || ''}
            onChange={(e) => handleInputChange('storeName', e.target.value)}
            placeholder="Enter your store name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="storeUrl">Store URL</Label>
          <Input
            id="storeUrl"
            value={formData.storeUrl || ''}
            onChange={(e) => handleInputChange('storeUrl', e.target.value)}
            placeholder="https://mystore.com"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="contactEmail">Contact Email *</Label>
          <Input
            id="contactEmail"
            type="email"
            value={formData.contactEmail || ''}
            onChange={(e) => handleInputChange('contactEmail', e.target.value)}
            placeholder="contact@store.com"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="contactPhone">Contact Phone</Label>
          <Input
            id="contactPhone"
            value={formData.contactPhone || ''}
            onChange={(e) => handleInputChange('contactPhone', e.target.value)}
            placeholder="+1 234 567 8900"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Store Description *</Label>
        <Textarea
          id="description"
          value={formData.description || ''}
          onChange={(e) => handleInputChange('description', e.target.value)}
          placeholder="Describe your store and what you sell"
          rows={4}
        />
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Marketplace Integration</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {['Amazon', 'eBay', 'Shopify', 'WooCommerce'].map((marketplace) => (
            <label key={marketplace} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.marketplaces?.includes(marketplace) || false}
                onChange={(e) => {
                  const current = formData.marketplaces || [];
                  if (e.target.checked) {
                    handleInputChange('marketplaces', [...current, marketplace]);
                  } else {
                    handleInputChange('marketplaces', current.filter((m: string) => m !== marketplace));
                  }
                }}
              />
              <span>{marketplace}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  // Affiliate Verification Form
  const AffiliateVerificationForm = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="websiteUrl">Website/Blog URL</Label>
          <Input
            id="websiteUrl"
            value={formData.websiteUrl || ''}
            onChange={(e) => handleInputChange('websiteUrl', e.target.value)}
            placeholder="https://myblog.com"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="audienceSize">Audience Size</Label>
          <Input
            id="audienceSize"
            type="number"
            value={formData.audienceSize || ''}
            onChange={(e) => handleInputChange('audienceSize', e.target.value)}
            placeholder="Estimated audience size"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="promotionMethods">How will you promote our products? *</Label>
        <Textarea
          id="promotionMethods"
          value={formData.promotionMethods || ''}
          onChange={(e) => handleInputChange('promotionMethods', e.target.value)}
          placeholder="Describe your promotion methods and channels"
          rows={4}
        />
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Social Media Profiles</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {['youtube', 'instagram', 'facebook', 'tiktok', 'twitter', 'linkedin'].map((platform) => (
            <div key={platform} className="space-y-2">
              <Label htmlFor={platform}>
                {platform.charAt(0).toUpperCase() + platform.slice(1)}
              </Label>
              <Input
                id={platform}
                value={formData.socialMedia?.[platform] || ''}
                onChange={(e) => handleInputChange('socialMedia', {
                  ...formData.socialMedia,
                  [platform]: e.target.value
                })}
                placeholder={`@username or URL`}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="taxId">Tax ID (for payments)</Label>
        <Input
          id="taxId"
          value={formData.taxId || ''}
          onChange={(e) => handleInputChange('taxId', e.target.value)}
          placeholder="Tax identification number"
        />
      </div>
    </div>
  );

  // Verification Status Display
  const renderVerificationStatus = () => {
    switch (verificationStatus) {
      case 'verified':
        return (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle>Verified</AlertTitle>
            <AlertDescription>
              Your {type} account has been verified and is active.
            </AlertDescription>
          </Alert>
        );
      case 'pending':
        return (
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertTitle>Verification Pending</AlertTitle>
            <AlertDescription>
              Your verification request is being reviewed. This usually takes 1-2 business days.
            </AlertDescription>
          </Alert>
        );
      case 'rejected':
        return (
          <Alert className="border-red-200 bg-red-50">
            <XCircle className="h-4 w-4 text-red-600" />
            <AlertTitle>Verification Rejected</AlertTitle>
            <AlertDescription>
              Your verification request was rejected. Please review the requirements and submit again.
            </AlertDescription>
          </Alert>
        );
      default:
        return null;
    }
  };

  // Render the appropriate form based on type
  const renderForm = () => {
    switch (type) {
      case 'supplier':
        return <SupplierVerificationForm />;
      case 'seller':
        return <SellerVerificationForm />;
      case 'affiliate':
        return <AffiliateVerificationForm />;
      default:
        return null;
    }
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-2xl">
              {type.charAt(0).toUpperCase() + type.slice(1)} Verification
            </CardTitle>
            <CardDescription>
              Complete the verification process to activate your {type} account
            </CardDescription>
          </div>
          <Badge variant={
            verificationStatus === 'verified' ? 'default' :
            verificationStatus === 'pending' ? 'secondary' :
            verificationStatus === 'rejected' ? 'destructive' :
            'outline'
          }>
            {verificationStatus.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        {renderVerificationStatus()}
        
        {verificationStatus !== 'verified' && (
          <div className="mt-6">
            {renderForm()}
          </div>
        )}
      </CardContent>

      {verificationStatus !== 'verified' && verificationStatus !== 'pending' && (
        <CardFooter>
          <Button 
            onClick={handleSubmit} 
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Submitting...' : 'Submit Verification Request'}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

export default RoleVerification;