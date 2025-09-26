import React, { useState, useEffect } from 'react';
import { Building2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import toast from 'react-hot-toast';
import { UserApi } from '@/api/userApi';

interface BusinessInfo {
  id?: string;
  userId: string;
  businessName: string;
  businessType: string;
  businessRegistrationNumber?: string;
  taxId?: string;
  description?: string;
  industry?: string;
  website?: string;
  phone?: string;
  email?: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
  };
  businessHours?: {
    [key: string]: {
      open: string;
      close: string;
      closed: boolean;
    };
  };
  verificationStatus: 'pending' | 'verified' | 'rejected';
  verificationDocuments?: string[];
  contactPerson?: {
    name?: string;
    title?: string;
    phone?: string;
    email?: string;
  };
}

interface BusinessInfoSectionProps {
  userId: string;
  userRole?: string;
  onBusinessInfoChange?: (businessInfo: BusinessInfo) => void;
}

const BUSINESS_TYPES = [
  { value: 'corporation', label: 'Corporation' },
  { value: 'llc', label: 'Limited Liability Company (LLC)' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'sole_proprietorship', label: 'Sole Proprietorship' },
  { value: 'nonprofit', label: 'Non-Profit Organization' },
  { value: 'other', label: 'Other' },
];

const INDUSTRIES = [
  { value: 'retail', label: 'Retail' },
  { value: 'technology', label: 'Technology' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'education', label: 'Education' },
  { value: 'finance', label: 'Finance' },
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'food_beverage', label: 'Food & Beverage' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'services', label: 'Services' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'other', label: 'Other' },
];

const DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_LABELS = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

export default function BusinessInfoSection({ userId, userRole, onBusinessInfoChange }: BusinessInfoSectionProps) {
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);
  
  const isBusiness = userRole === 'business' || userRole === 'vendor' || userRole === 'seller';

  useEffect(() => {
    if (isBusiness && userId) {
      fetchBusinessInfo();
    }
  }, [userId, isBusiness]);

  const fetchBusinessInfo = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/v1/users/${userId}/business-info`);
      
      if (response.data.success) {
        setBusinessInfo(response.data.data);
        setExpanded(true);
      }
    } catch (error) {
      // If no business info exists yet, initialize with defaults
      setBusinessInfo({
        userId,
        businessName: '',
        businessType: '',
        description: '',
        address: {
          street: '',
          city: '',
          state: '',
          zipCode: '',
          country: 'US',
        },
        verificationStatus: 'pending',
      });
      setExpanded(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!businessInfo) return;

    try {
      setSaving(true);
      
      if (businessInfo.id) {
        await api.put(`/api/v1/users/${userId}/business-info`, businessInfo);
        toast.success('Business information updated successfully');
      } else {
        const response = await api.post(`/api/v1/users/${userId}/business-info`, businessInfo);
        setBusinessInfo(response.data.data);
        toast.success('Business information created successfully');
      }

      if (onBusinessInfoChange) {
        onBusinessInfoChange(businessInfo);
      }
    } catch (error) {
      toast.error('Failed to save business information');
    } finally {
      setSaving(false);
    }
  };

  const updateBusinessInfo = (updates: Partial<BusinessInfo>) => {
    if (!businessInfo) return;
    
    const updated = { ...businessInfo, ...updates };
    setBusinessInfo(updated);
  };

  const updateAddress = (field: keyof BusinessInfo['address'], value: string) => {
    if (!businessInfo) return;
    
    updateBusinessInfo({
      address: { ...businessInfo.address, [field]: value }
    });
  };

  const updateSocialMedia = (platform: string, value: string) => {
    if (!businessInfo) return;
    
    updateBusinessInfo({
      socialMedia: { ...businessInfo.socialMedia, [platform]: value }
    });
  };

  const updateBusinessHours = (day: string, hours: { open: string; close: string; closed: boolean }) => {
    if (!businessInfo) return;
    
    updateBusinessInfo({
      businessHours: { ...businessInfo.businessHours, [day]: hours }
    });
  };

  const updateContactPerson = (field: string, value: string) => {
    if (!businessInfo) return;
    
    updateBusinessInfo({
      contactPerson: { ...businessInfo.contactPerson, [field]: value }
    });
  };

  if (!isBusiness) {
    return null;
  }

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <Card>
        <CollapsibleTrigger>
          <CardHeader className="cursor-pointer hover:bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-blue-600" />
                <div>
                  <CardTitle>Business Information</CardTitle>
                  <CardDescription>
                    Additional business details for verification and display
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {businessInfo && (
                  <Badge 
                    variant={businessInfo.verificationStatus === 'verified' ? 'default' : 'secondary'}
                    className={
                      businessInfo.verificationStatus === 'verified' ? 'bg-green-100 text-green-800' :
                      businessInfo.verificationStatus === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }
                  >
                    {businessInfo.verificationStatus}
                  </Badge>
                )}
                <Button variant="ghost" size="sm">
                  {expanded ? 'Collapse' : 'Expand'}
                </Button>
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-6">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-gray-500">Loading business information...</div>
              </div>
            ) : businessInfo ? (
              <>
                {/* Basic Business Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="businessName">Business Name *</Label>
                    <Input
                      id="businessName"
                      value={businessInfo.businessName}
                      onChange={(e) => updateBusinessInfo({ businessName: e.target.value })}
                      placeholder="Your Business Name"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="businessType">Business Type *</Label>
                    <Select
                      value={businessInfo.businessType}
                      onValueChange={(value) => updateBusinessInfo({ businessType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select business type" />
                      </SelectTrigger>
                      <SelectContent>
                        {BUSINESS_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="industry">Industry</Label>
                    <Select
                      value={businessInfo.industry || ''}
                      onValueChange={(value) => updateBusinessInfo({ industry: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select industry" />
                      </SelectTrigger>
                      <SelectContent>
                        {INDUSTRIES.map((industry) => (
                          <SelectItem key={industry.value} value={industry.value}>
                            {industry.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="businessRegistrationNumber">Registration Number</Label>
                    <Input
                      id="businessRegistrationNumber"
                      value={businessInfo.businessRegistrationNumber || ''}
                      onChange={(e) => updateBusinessInfo({ businessRegistrationNumber: e.target.value })}
                      placeholder="Business registration number"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Business Description</Label>
                  <Textarea
                    id="description"
                    value={businessInfo.description || ''}
                    onChange={(e) => updateBusinessInfo({ description: e.target.value })}
                    placeholder="Describe your business..."
                    rows={3}
                  />
                </div>

                {/* Contact Information */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Contact Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="businessPhone">Business Phone</Label>
                      <Input
                        id="businessPhone"
                        value={businessInfo.phone || ''}
                        onChange={(e) => updateBusinessInfo({ phone: e.target.value })}
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="businessEmail">Business Email</Label>
                      <Input
                        id="businessEmail"
                        type="email"
                        value={businessInfo.email || ''}
                        onChange={(e) => updateBusinessInfo({ email: e.target.value })}
                        placeholder="contact@business.com"
                      />
                    </div>

                    <div>
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        type="url"
                        value={businessInfo.website || ''}
                        onChange={(e) => updateBusinessInfo({ website: e.target.value })}
                        placeholder="https://www.business.com"
                      />
                    </div>
                  </div>
                </div>

                {/* Address */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Business Address</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <Label htmlFor="street">Street Address</Label>
                      <Input
                        id="street"
                        value={businessInfo.address.street}
                        onChange={(e) => updateAddress('street', e.target.value)}
                        placeholder="123 Main Street"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={businessInfo.address.city}
                        onChange={(e) => updateAddress('city', e.target.value)}
                        placeholder="New York"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        value={businessInfo.address.state}
                        onChange={(e) => updateAddress('state', e.target.value)}
                        placeholder="NY"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="zipCode">ZIP Code</Label>
                      <Input
                        id="zipCode"
                        value={businessInfo.address.zipCode}
                        onChange={(e) => updateAddress('zipCode', e.target.value)}
                        placeholder="10001"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="country">Country</Label>
                      <Select
                        value={businessInfo.address.country}
                        onValueChange={(value) => updateAddress('country', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="US">United States</SelectItem>
                          <SelectItem value="CA">Canada</SelectItem>
                          <SelectItem value="GB">United Kingdom</SelectItem>
                          <SelectItem value="AU">Australia</SelectItem>
                          <SelectItem value="KR">South Korea</SelectItem>
                          <SelectItem value="JP">Japan</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button variant="outline" onClick={() => setExpanded(false)}>
                    Collapse
                  </Button>
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving...' : 'Save Business Info'}
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <Building2 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No business information</h3>
                <p className="text-gray-600 mb-4">
                  Add business information to enable additional features
                </p>
                <Button onClick={fetchBusinessInfo}>
                  Add Business Information
                </Button>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}