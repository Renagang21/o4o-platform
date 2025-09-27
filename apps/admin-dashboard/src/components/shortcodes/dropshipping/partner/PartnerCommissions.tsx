import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  DollarSign,
  Download,
  Calendar,
  CreditCard,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  TrendingUp
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface Commission {
  id: string;
  orderId: string;
  orderDate: string;
  productName: string;
  productImage?: string;
  customerName: string;
  orderAmount: number;
  commissionRate: number;
  commissionAmount: number;
  status: 'pending' | 'approved' | 'paid' | 'cancelled';
  approvedDate?: string;
  paidDate?: string;
  paymentMethod?: string;
  transactionId?: string;
  notes?: string;
}

interface CommissionSummary {
  totalEarned: number;
  pendingAmount: number;
  paidAmount: number;
  currentMonth: number;
  lastMonth: number;
  totalTransactions: number;
}

interface PartnerCommissionsProps {
  period?: '7d' | '30d' | '90d' | '1y';
  status?: 'all' | 'pending' | 'approved' | 'paid' | 'cancelled';
  compact?: boolean;
  showSummary?: boolean;
}

const PartnerCommissions: React.FC<PartnerCommissionsProps> = ({
  period = '30d',
  status = 'all',
  compact = false,
  showSummary = true
}) => {
  const { toast } = useToast();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [summary, setSummary] = useState<CommissionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState(period);
  const [selectedStatus, setSelectedStatus] = useState(status);

  useEffect(() => {
    fetchCommissions();
  }, [selectedPeriod, selectedStatus]);

  const fetchCommissions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        period: selectedPeriod,
        status: selectedStatus !== 'all' ? selectedStatus : ''
      });

      const [commissionsRes, summaryRes] = await Promise.all([
        fetch(`/api/v1/dropshipping/partner/commissions?${params}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        showSummary ? fetch(`/api/v1/dropshipping/partner/commissions/summary?${params}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }) : Promise.resolve(null)
      ]);

      if (commissionsRes.ok) {
        const data = await commissionsRes.json();
        setCommissions(data.commissions || []);
      }

      if (summaryRes && summaryRes.ok) {
        const data = await summaryRes.json();
        setSummary(data.summary);
      }
    } catch (error) {
      console.error('Commissions fetch error:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch commission data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        period: selectedPeriod,
        status: selectedStatus !== 'all' ? selectedStatus : '',
        format: 'csv'
      });

      const response = await fetch(`/api/v1/dropshipping/partner/commissions/export?${params}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `commissions-${selectedPeriod}-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        
        toast({
          title: 'Success',
          description: 'Commission data exported successfully'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to export data',
        variant: 'destructive'
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'approved':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'pending':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'approved': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {showSummary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="h-64 bg-gray-200 rounded"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      {!compact && (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Commission History</h2>
            <p className="text-gray-600">Track your earnings and payment status</p>
          </div>
          <div className="flex space-x-2">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="1y">Last year</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      {showSummary && summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Earned</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${summary.totalEarned.toLocaleString()}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    ${summary.pendingAmount.toLocaleString()}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">This Month</p>
                  <p className="text-2xl font-bold text-blue-600">
                    ${summary.currentMonth.toLocaleString()}
                  </p>
                  <div className="flex items-center mt-1">
                    <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                    <span className="text-xs text-green-600">
                      vs ${summary.lastMonth.toLocaleString()} last month
                    </span>
                  </div>
                </div>
                <Calendar className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Transactions</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {summary.totalTransactions}
                  </p>
                </div>
                <FileText className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Commissions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CreditCard className="h-5 w-5 mr-2" />
            Recent Commissions
          </CardTitle>
          <CardDescription>
            Your commission earnings and payment details
          </CardDescription>
        </CardHeader>
        <CardContent>
          {commissions.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No commissions found for the selected period and status.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Product</TableHead>
                    {!compact && <TableHead>Customer</TableHead>}
                    <TableHead>Order Value</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Commission</TableHead>
                    <TableHead>Status</TableHead>
                    {!compact && <TableHead>Payment</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commissions.map((commission) => (
                    <TableRow key={commission.id} className="hover:bg-gray-50">
                      <TableCell className="font-mono text-sm">
                        {commission.orderId.slice(-8)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatDate(commission.orderDate)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2 max-w-[200px]">
                          {commission.productImage && (
                            <img 
                              src={commission.productImage} 
                              alt={commission.productName}
                              className="h-8 w-8 rounded object-cover"
                            />
                          )}
                          <span className="text-sm truncate">{commission.productName}</span>
                        </div>
                      </TableCell>
                      {!compact && (
                        <TableCell className="text-sm">
                          {commission.customerName}
                        </TableCell>
                      )}
                      <TableCell className="font-medium">
                        ${commission.orderAmount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {commission.commissionRate}%
                        </Badge>
                      </TableCell>
                      <TableCell className="font-bold text-green-600">
                        ${commission.commissionAmount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(commission.status)}
                          <Badge className={getStatusColor(commission.status)}>
                            {commission.status}
                          </Badge>
                        </div>
                      </TableCell>
                      {!compact && (
                        <TableCell>
                          <div className="text-xs text-gray-500">
                            {commission.status === 'paid' && commission.paidDate && (
                              <div>
                                <div>Paid: {formatDate(commission.paidDate)}</div>
                                {commission.paymentMethod && (
                                  <div>Via: {commission.paymentMethod}</div>
                                )}
                                {commission.transactionId && (
                                  <div className="font-mono">ID: {commission.transactionId.slice(-8)}</div>
                                )}
                              </div>
                            )}
                            {commission.status === 'approved' && commission.approvedDate && (
                              <div>Approved: {formatDate(commission.approvedDate)}</div>
                            )}
                            {commission.notes && (
                              <div className="italic mt-1">{commission.notes}</div>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Status Legend */}
      {!compact && (
        <Card className="bg-gray-50">
          <CardContent className="p-4">
            <h4 className="font-semibold mb-2">Payment Status Guide</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <span><strong>Pending:</strong> Awaiting approval</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span><strong>Approved:</strong> Ready for payment</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span><strong>Paid:</strong> Payment completed</span>
              </div>
              <div className="flex items-center space-x-2">
                <XCircle className="h-4 w-4 text-red-600" />
                <span><strong>Cancelled:</strong> Order cancelled</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PartnerCommissions;