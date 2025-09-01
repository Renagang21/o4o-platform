import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Link,
  Copy,
  QrCode,
  Share2,
  ExternalLink,
  Plus,
  Trash2,
  MousePointer,
  ShoppingCart,
  DollarSign,
  Smartphone,
  Facebook,
  Twitter,
  MessageCircle,
  Mail
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
// QRCode functionality will be added when qrcode package is available

interface AffiliateLink {
  id: string;
  url: string;
  shortUrl: string;
  customAlias?: string;
  productId?: string;
  productName?: string;
  productImage?: string;
  categoryId?: string;
  categoryName?: string;
  campaignName?: string;
  description?: string;
  qrCodeUrl?: string;
  clicks: number;
  uniqueClicks: number;
  conversions: number;
  conversionRate: number;
  revenue: number;
  commission: number;
  platform?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  createdAt: string;
  expiresAt?: string;
  isActive: boolean;
}

interface Product {
  id: string;
  name: string;
  image: string;
  price: number;
  commissionRate: number;
  category: string;
}

const AffiliateLinkGenerator: React.FC = () => {
  const { toast } = useToast();
  const [links, setLinks] = useState<AffiliateLink[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLink, setSelectedLink] = useState<AffiliateLink | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [selectedTab, setSelectedTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [linkFormData, setLinkFormData] = useState({
    productId: '',
    categoryId: '',
    customAlias: '',
    campaignName: '',
    description: '',
    platform: '',
    utmSource: '',
    utmMedium: '',
    utmCampaign: '',
    expiresAt: ''
  });
  const [qrCodeData] = useState('');

  // Integration with AFFILIATE app
  const affiliateAppBaseUrl = process.env.NEXT_PUBLIC_AFFILIATE_APP_URL || 'https://affiliate.app';
  const affiliateApiKey = localStorage.getItem('affiliate_api_key');

  useEffect(() => {
    fetchAffiliateLinks();
    fetchProducts();
    checkAffiliateAppConnection();
  }, [selectedTab]);

  const checkAffiliateAppConnection = async () => {
    try {
      const response = await fetch(`${affiliateAppBaseUrl}/api/v1/connection/status`, {
        headers: {
          'Authorization': `Bearer ${affiliateApiKey}`,
          'X-Platform': 'dropshipping'
        }
      });

      if (!response.ok) {
        toast({
          title: 'AFFILIATE App Connection',
          description: 'Please connect your AFFILIATE app account in settings'
        });
      }
    } catch (error) {
      // Error log removed
    }
  };

  const fetchAffiliateLinks = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/dropshipping/affiliate/links', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setLinks(data.links || []);
      }
    } catch (error) {
      // Error log removed
      toast({
        title: 'Error',
        description: 'Failed to fetch affiliate links',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/v1/dropshipping/products/affiliate-eligible', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
      }
    } catch (error) {
      // Error log removed
    }
  };

  const handleCreateLink = async () => {
    try {
      // Create link in dropshipping platform
      const response = await fetch('/api/v1/dropshipping/affiliate/links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(linkFormData)
      });

      if (response.ok) {
        const newLink = await response.json();
        
        // Sync with AFFILIATE app
        if (affiliateApiKey) {
          await syncWithAffiliateApp(newLink);
        }

        toast({
          title: 'Success',
          description: 'Affiliate link created successfully'
        });
        setShowCreateDialog(false);
        fetchAffiliateLinks();
      }
    } catch (error) {
      // Error log removed
      toast({
        title: 'Error',
        description: 'Failed to create affiliate link',
        variant: 'destructive'
      });
    }
  };

  const syncWithAffiliateApp = async (link: any) => {
    try {
      await fetch(`${affiliateAppBaseUrl}/api/v1/links/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${affiliateApiKey}`,
          'X-Platform': 'dropshipping'
        },
        body: JSON.stringify({
          externalId: link.id,
          url: link.url,
          metadata: {
            productId: link.productId,
            campaignName: link.campaignName,
            platform: 'dropshipping'
          }
        })
      });
    } catch (error) {
      // Error log removed
    }
  };

  const handleGenerateQRCode = async (link: AffiliateLink) => {
    // QR code generation will be implemented when qrcode package is available
    setSelectedLink(link);
    setShowQRDialog(true);
    toast({
      title: 'Info',
      description: 'QR code generation not yet available'
    });
  };

  const handleDeleteLink = async (linkId: string) => {
    if (!confirm('Are you sure you want to delete this affiliate link?')) return;

    try {
      const response = await fetch(`/api/v1/dropshipping/affiliate/links/${linkId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Affiliate link deleted successfully'
        });
        fetchAffiliateLinks();
      }
    } catch (error) {
      // Error log removed
      toast({
        title: 'Error',
        description: 'Failed to delete affiliate link',
        variant: 'destructive'
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: 'Link copied to clipboard'
    });
  };

  const generateSocialShareUrl = (platform: string, link: AffiliateLink) => {
    const text = link.description || `Check out ${link.productName || 'this amazing product'}!`;
    const url = link.shortUrl;

    switch (platform) {
      case 'facebook':
        return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
      case 'twitter':
        return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
      case 'whatsapp':
        return `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`;
      case 'telegram':
        return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
      case 'email':
        return `mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(url)}`;
      default:
        return url;
    }
  };

  const filteredLinks = links.filter(link => {
    const matchesSearch = link.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          link.campaignName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          link.customAlias?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (selectedTab === 'all') return matchesSearch;
    if (selectedTab === 'active') return matchesSearch && link.isActive;
    if (selectedTab === 'expired') return matchesSearch && link.expiresAt && new Date(link.expiresAt) < new Date();
    
    return matchesSearch;
  });

  // Create Link Dialog
  const CreateLinkDialog = () => (
    <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Affiliate Link</DialogTitle>
          <DialogDescription>
            Generate a trackable affiliate link for products or categories
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="product">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="product">Product Link</TabsTrigger>
            <TabsTrigger value="category">Category Link</TabsTrigger>
          </TabsList>

          <TabsContent value="product" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="productId">Select Product</Label>
              <Select
                value={linkFormData.productId}
                onValueChange={(value) => setLinkFormData({ ...linkFormData, productId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      <div className="flex items-center space-x-2">
                        <img src={product.image} alt={product.name} className="h-6 w-6 rounded" />
                        <span>{product.name}</span>
                        <Badge variant="secondary" className="ml-auto">
                          {product.commissionRate}% commission
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="category" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="categoryId">Select Category</Label>
              <Select
                value={linkFormData.categoryId}
                onValueChange={(value) => setLinkFormData({ ...linkFormData, categoryId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="electronics">Electronics</SelectItem>
                  <SelectItem value="fashion">Fashion</SelectItem>
                  <SelectItem value="home">Home & Garden</SelectItem>
                  <SelectItem value="beauty">Beauty</SelectItem>
                  <SelectItem value="sports">Sports</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>
        </Tabs>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customAlias">Custom Alias (Optional)</Label>
              <Input
                id="customAlias"
                value={linkFormData.customAlias}
                onChange={(e) => setLinkFormData({ ...linkFormData, customAlias: e.target.value })}
                placeholder="my-product"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="campaignName">Campaign Name</Label>
              <Input
                id="campaignName"
                value={linkFormData.campaignName}
                onChange={(e) => setLinkFormData({ ...linkFormData, campaignName: e.target.value })}
                placeholder="Summer Sale 2024"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={linkFormData.description}
              onChange={(e) => setLinkFormData({ ...linkFormData, description: e.target.value })}
              placeholder="Description for social sharing"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="platform">Platform</Label>
              <Select
                value={linkFormData.platform}
                onValueChange={(value) => setLinkFormData({ ...linkFormData, platform: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="website">Website</SelectItem>
                  <SelectItem value="youtube">YouTube</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                  <SelectItem value="blog">Blog</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiresAt">Expiration Date (Optional)</Label>
              <Input
                id="expiresAt"
                type="date"
                value={linkFormData.expiresAt}
                onChange={(e) => setLinkFormData({ ...linkFormData, expiresAt: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>UTM Parameters (Optional)</Label>
            <div className="grid grid-cols-3 gap-2">
              <Input
                placeholder="utm_source"
                value={linkFormData.utmSource}
                onChange={(e) => setLinkFormData({ ...linkFormData, utmSource: e.target.value })}
              />
              <Input
                placeholder="utm_medium"
                value={linkFormData.utmMedium}
                onChange={(e) => setLinkFormData({ ...linkFormData, utmMedium: e.target.value })}
              />
              <Input
                placeholder="utm_campaign"
                value={linkFormData.utmCampaign}
                onChange={(e) => setLinkFormData({ ...linkFormData, utmCampaign: e.target.value })}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreateLink}>
            Generate Link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // QR Code Dialog
  const QRCodeDialog = () => (
    <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>QR Code</DialogTitle>
          <DialogDescription>
            Scan this QR code to access your affiliate link
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-4">
          {qrCodeData && (
            <img src={qrCodeData} alt="QR Code" className="border p-4 rounded-lg" />
          )}
          
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">Link:</p>
            <code className="text-xs bg-gray-100 px-2 py-1 rounded">
              {selectedLink?.shortUrl}
            </code>
          </div>

          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => {
                const link = document.createElement('a');
                link.download = `qr-code-${selectedLink?.customAlias || 'affiliate'}.png`;
                link.href = qrCodeData;
                link.click();
              }}
            >
              Download QR Code
            </Button>
            <Button
              onClick={() => {
                navigator.clipboard.writeText(selectedLink?.shortUrl || '');
                toast({
                  title: 'Copied!',
                  description: 'Link copied to clipboard'
                });
              }}
            >
              Copy Link
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  // Share Dialog
  const ShareDialog = () => (
    <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share Affiliate Link</DialogTitle>
          <DialogDescription>
            Share your affiliate link on social media
          </DialogDescription>
        </DialogHeader>

        {selectedLink && (
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium mb-2">{selectedLink.productName || 'Category Link'}</p>
              <code className="text-xs">{selectedLink.shortUrl}</code>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={() => window.open(generateSocialShareUrl('facebook', selectedLink), '_blank')}
              >
                <Facebook className="h-4 w-4 mr-2" />
                Facebook
              </Button>
              <Button
                variant="outline"
                onClick={() => window.open(generateSocialShareUrl('twitter', selectedLink), '_blank')}
              >
                <Twitter className="h-4 w-4 mr-2" />
                Twitter
              </Button>
              <Button
                variant="outline"
                onClick={() => window.open(generateSocialShareUrl('whatsapp', selectedLink), '_blank')}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                WhatsApp
              </Button>
              <Button
                variant="outline"
                onClick={() => window.open(generateSocialShareUrl('telegram', selectedLink), '_blank')}
              >
                <Send className="h-4 w-4 mr-2" />
                Telegram
              </Button>
              <Button
                variant="outline"
                onClick={() => window.open(generateSocialShareUrl('email', selectedLink), '_blank')}
              >
                <Mail className="h-4 w-4 mr-2" />
                Email
              </Button>
              <Button
                variant="outline"
                onClick={() => copyToClipboard(selectedLink.shortUrl)}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Link
              </Button>
            </div>

            {selectedLink.description && (
              <div className="space-y-2">
                <Label>Suggested Caption</Label>
                <Textarea
                  value={selectedLink.description}
                  readOnly
                  rows={3}
                  className="resize-none"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(selectedLink.description || '');
                    toast({
                      title: 'Copied!',
                      description: 'Caption copied to clipboard'
                    });
                  }}
                >
                  Copy Caption
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Affiliate Links</h2>
          <p className="text-muted-foreground">
            Create and manage your affiliate links
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Smartphone className="mr-2 h-4 w-4" />
            Connect AFFILIATE App
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Link
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Links</CardTitle>
            <Link className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{links.length}</div>
            <p className="text-xs text-muted-foreground">
              {links.filter(l => l.isActive).length} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {links.reduce((sum, link) => sum + link.clicks, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {links.reduce((sum, link) => sum + link.uniqueClicks, 0).toLocaleString()} unique
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversions</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {links.reduce((sum, link) => sum + link.conversions, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {(links.reduce((sum, link) => sum + link.conversionRate, 0) / links.length || 0).toFixed(1)}% rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Commission</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${links.reduce((sum, link) => sum + link.commission, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Total earned
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Links Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Your Affiliate Links</CardTitle>
            <div className="flex space-x-2">
              <Input
                placeholder="Search links..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList>
              <TabsTrigger value="all">All Links</TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="expired">Expired</TabsTrigger>
            </TabsList>

            <TabsContent value={selectedTab}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Link/Product</TableHead>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Performance</TableHead>
                    <TableHead>Earnings</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        Loading affiliate links...
                      </TableCell>
                    </TableRow>
                  ) : filteredLinks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        No affiliate links found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLinks.map((link) => (
                      <TableRow key={link.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            {link.productImage ? (
                              <img 
                                src={link.productImage} 
                                alt={link.productName}
                                className="h-10 w-10 rounded object-cover"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded bg-gray-100 flex items-center justify-center">
                                <Link className="h-5 w-5 text-gray-400" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium">
                                {link.productName || link.categoryName || 'General Link'}
                              </p>
                              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                                <code>{link.customAlias || link.shortUrl.split('/').pop()}</code>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-4 w-4 p-0"
                                  onClick={() => copyToClipboard(link.shortUrl)}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm">{link.campaignName || '-'}</p>
                            {link.platform && (
                              <Badge variant="outline" className="text-xs">
                                {link.platform}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2 text-sm">
                              <MousePointer className="h-3 w-3" />
                              <span>{link.clicks.toLocaleString()} clicks</span>
                            </div>
                            <div className="flex items-center space-x-2 text-sm">
                              <ShoppingCart className="h-3 w-3" />
                              <span>{link.conversions} sales</span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {link.conversionRate.toFixed(1)}% conversion
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">${link.commission.toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground">
                              ${link.revenue.toFixed(2)} revenue
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={link.isActive ? 'default' : 'secondary'}>
                            {link.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                          {link.expiresAt && new Date(link.expiresAt) < new Date() && (
                            <Badge variant="destructive" className="ml-1">
                              Expired
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => window.open(link.shortUrl, '_blank')}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleGenerateQRCode(link)}
                            >
                              <QrCode className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedLink(link);
                                setShowShareDialog(true);
                              }}
                            >
                              <Share2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteLink(link.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <CreateLinkDialog />
      <QRCodeDialog />
      <ShareDialog />
    </div>
  );
};

// Add Send icon component
const Send: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
  </svg>
);

export default AffiliateLinkGenerator;