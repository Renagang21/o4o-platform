import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
  DollarSign,
  CreditCard,
  Building,
  Wallet,
  CheckCircle,
  Clock,
  XCircle,
  Send,
  Info,
  Shield,
  TrendingUp,
  Copy
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';

interface PayoutAccount {
  id: string;
  type: 'bank' | 'paypal' | 'stripe' | 'crypto';
  name: string;
  details: Record<string, string>;
  isDefault: boolean;
  isVerified: boolean;
  lastUsed?: string;
}

interface PayoutRequest {
  id: string;
  requestNumber: string;
  amount: number;
  fee: number;
  netAmount: number;
  method: string;
  accountId: string;
  accountName: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  requestedAt: string;
  processedAt?: string;
  transactionId?: string;
  notes?: string;
  failureReason?: string;
}

interface PayoutSummary {
  availableBalance: number;
  pendingBalance: number;
  minimumPayout: number;
  processingFee: number;
  processingTime: string;
  totalPaidOut: number;
  lastPayoutDate?: string;
  nextPayoutDate?: string;
  payoutSchedule: 'weekly' | 'biweekly' | 'monthly' | 'on_demand';
}

interface PayoutHistory {
  totalRequests: number;
  successfulPayouts: number;
  totalAmount: number;
  averageAmount: number;
  lastSixMonths: Array<{
    month: string;
    amount: number;
    count: number;
  }>;
}

const PayoutRequests: React.FC = () => {
  const { toast } = useToast();
  const [summary, setSummary] = useState<PayoutSummary | null>(null);
  const [accounts, setAccounts] = useState<PayoutAccount[]>([]);
  const [requests, setRequests] = useState<PayoutRequest[]>([]);
  const [history, setHistory] = useState<PayoutHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('request');
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [showAccountDialog, setShowAccountDialog] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<PayoutAccount | null>(null);
  const [requestAmount, setRequestAmount] = useState('');
  const [requestNotes, setRequestNotes] = useState('');
  const [newAccountData, setNewAccountData] = useState({
    type: 'bank',
    name: '',
    details: {} as Record<string, string>
  });

  useEffect(() => {
    fetchPayoutData();
  }, []);

  const fetchPayoutData = async () => {
    try {
      setLoading(true);
      
      const [summaryRes, accountsRes, requestsRes, historyRes] = await Promise.all([
        fetch('/api/v1/dropshipping/affiliate/payout/summary', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch('/api/v1/dropshipping/affiliate/payout/accounts', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch('/api/v1/dropshipping/affiliate/payout/requests', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch('/api/v1/dropshipping/affiliate/payout/history', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
      ]);

      if (summaryRes.ok) {
        const data = await summaryRes.json();
        setSummary(data);
      }

      if (accountsRes.ok) {
        const data = await accountsRes.json();
        setAccounts(data.accounts || []);
        
        // Set default account if exists
        const defaultAccount = data.accounts?.find((acc: PayoutAccount) => acc.isDefault);
        if (defaultAccount) {
          setSelectedAccount(defaultAccount);
        }
      }

      if (requestsRes.ok) {
        const data = await requestsRes.json();
        setRequests(data.requests || []);
      }

      if (historyRes.ok) {
        const data = await historyRes.json();
        setHistory(data);
      }
    } catch (error) {
      console.error('Error fetching payout data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch payout data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPayout = async () => {
    if (!selectedAccount) {
      toast({
        title: 'Error',
        description: 'Please select a payout account',
        variant: 'destructive'
      });
      return;
    }

    const amount = parseFloat(requestAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'Error',
        description: 'Please enter a valid amount',
        variant: 'destructive'
      });
      return;
    }

    if (amount < (summary?.minimumPayout || 0)) {
      toast({
        title: 'Error',
        description: `Minimum payout amount is $${summary?.minimumPayout}`,
        variant: 'destructive'
      });
      return;
    }

    if (amount > (summary?.availableBalance || 0)) {
      toast({
        title: 'Error',
        description: 'Insufficient balance',
        variant: 'destructive'
      });
      return;
    }

    try {
      const response = await fetch('/api/v1/dropshipping/affiliate/payout/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          amount,
          accountId: selectedAccount.id,
          notes: requestNotes
        })
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Payout request submitted successfully'
        });
        setShowRequestDialog(false);
        setRequestAmount('');
        setRequestNotes('');
        fetchPayoutData();
      }
    } catch (error) {
      console.error('Error requesting payout:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit payout request',
        variant: 'destructive'
      });
    }
  };

  const handleAddAccount = async () => {
    try {
      const response = await fetch('/api/v1/dropshipping/affiliate/payout/accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newAccountData)
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Payout account added successfully'
        });
        setShowAccountDialog(false);
        setNewAccountData({ type: 'bank', name: '', details: {} });
        fetchPayoutData();
      }
    } catch (error) {
      console.error('Error adding account:', error);
      toast({
        title: 'Error',
        description: 'Failed to add payout account',
        variant: 'destructive'
      });
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    if (!confirm('Are you sure you want to cancel this payout request?')) return;

    try {
      const response = await fetch(`/api/v1/dropshipping/affiliate/payout/requests/${requestId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Payout request cancelled'
        });
        fetchPayoutData();
      }
    } catch (error) {
      console.error('Error cancelling request:', error);
      toast({
        title: 'Error',
        description: 'Failed to cancel payout request',
        variant: 'destructive'
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'processing': return 'info';
      case 'pending': return 'warning';
      case 'failed': return 'destructive';
      case 'cancelled': return 'secondary';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'processing': return <Clock className="h-4 w-4" />;
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'failed': return <XCircle className="h-4 w-4" />;
      case 'cancelled': return <XCircle className="h-4 w-4" />;
      default: return null;
    }
  };

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'bank': return <Building className="h-4 w-4" />;
      case 'paypal': return <Wallet className="h-4 w-4" />;
      case 'stripe': return <CreditCard className="h-4 w-4" />;
      case 'crypto': return <DollarSign className="h-4 w-4" />;
      default: return <Wallet className="h-4 w-4" />;
    }
  };

  const calculateNetAmount = (amount: number) => {
    const fee = (summary?.processingFee || 0) / 100 * amount;
    return amount - fee;
  };

  // Request Payout Dialog
  const RequestPayoutDialog = () => (
    <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request Payout</DialogTitle>
          <DialogDescription>
            Request a payout from your available balance
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Balance Info */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Available Balance</AlertTitle>
            <AlertDescription>
              You have ${summary?.availableBalance?.toFixed(2)} available for payout
            </AlertDescription>
          </Alert>

          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="amount">Payout Amount</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="amount"
                type="number"
                value={requestAmount}
                onChange={(e) => setRequestAmount(e.target.value)}
                placeholder="0.00"
                className="pl-10"
                step="0.01"
                min={summary?.minimumPayout || 0}
                max={summary?.availableBalance || 0}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Minimum: ${summary?.minimumPayout} | Maximum: ${summary?.availableBalance?.toFixed(2)}
            </p>
          </div>

          {/* Fee Calculation */}
          {requestAmount && parseFloat(requestAmount) > 0 && (
            <div className="p-4 bg-gray-50 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span>Request Amount</span>
                <span>${parseFloat(requestAmount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Processing Fee ({summary?.processingFee}%)</span>
                <span className="text-red-600">
                  -${(parseFloat(requestAmount) * (summary?.processingFee || 0) / 100).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between font-medium border-t pt-2">
                <span>You'll Receive</span>
                <span className="text-green-600">
                  ${calculateNetAmount(parseFloat(requestAmount)).toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* Account Selection */}
          <div className="space-y-2">
            <Label>Payout Account</Label>
            <Select
              value={selectedAccount?.id}
              onValueChange={(value) => {
                const account = accounts.find(acc => acc.id === value);
                setSelectedAccount(account || null);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select payout account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    <div className="flex items-center space-x-2">
                      {getAccountIcon(account.type)}
                      <span>{account.name}</span>
                      {account.isDefault && (
                        <Badge variant="secondary" className="ml-2">Default</Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {accounts.length === 0 && (
              <Button
                variant="link"
                className="text-xs"
                onClick={() => {
                  setShowRequestDialog(false);
                  setShowAccountDialog(true);
                }}
              >
                Add a payout account
              </Button>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={requestNotes}
              onChange={(e) => setRequestNotes(e.target.value)}
              placeholder="Any special instructions or notes"
              rows={3}
            />
          </div>

          {/* Processing Time Info */}
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              Processing time: {summary?.processingTime}
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setShowRequestDialog(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleRequestPayout}
            disabled={!selectedAccount || !requestAmount || parseFloat(requestAmount) <= 0}
          >
            Submit Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // Add Account Dialog
  const AddAccountDialog = () => (
    <Dialog open={showAccountDialog} onOpenChange={setShowAccountDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Payout Account</DialogTitle>
          <DialogDescription>
            Add a new account for receiving payouts
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Account Type</Label>
            <Select
              value={newAccountData.type}
              onValueChange={(value) => setNewAccountData({
                ...newAccountData,
                type: value,
                details: {}
              })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bank">Bank Account</SelectItem>
                <SelectItem value="paypal">PayPal</SelectItem>
                <SelectItem value="stripe">Stripe</SelectItem>
                <SelectItem value="crypto">Cryptocurrency</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="accountName">Account Name</Label>
            <Input
              id="accountName"
              value={newAccountData.name}
              onChange={(e) => setNewAccountData({
                ...newAccountData,
                name: e.target.value
              })}
              placeholder="e.g., My Checking Account"
            />
          </div>

          {/* Dynamic fields based on account type */}
          {newAccountData.type === 'bank' && (
            <>
              <div className="space-y-2">
                <Label>Account Number</Label>
                <Input
                  value={newAccountData.details.accountNumber || ''}
                  onChange={(e) => setNewAccountData({
                    ...newAccountData,
                    details: { ...newAccountData.details, accountNumber: e.target.value }
                  })}
                  placeholder="Enter account number"
                />
              </div>
              <div className="space-y-2">
                <Label>Routing Number</Label>
                <Input
                  value={newAccountData.details.routingNumber || ''}
                  onChange={(e) => setNewAccountData({
                    ...newAccountData,
                    details: { ...newAccountData.details, routingNumber: e.target.value }
                  })}
                  placeholder="Enter routing number"
                />
              </div>
            </>
          )}

          {newAccountData.type === 'paypal' && (
            <div className="space-y-2">
              <Label>PayPal Email</Label>
              <Input
                type="email"
                value={newAccountData.details.email || ''}
                onChange={(e) => setNewAccountData({
                  ...newAccountData,
                  details: { ...newAccountData.details, email: e.target.value }
                })}
                placeholder="your@email.com"
              />
            </div>
          )}

          {newAccountData.type === 'crypto' && (
            <>
              <div className="space-y-2">
                <Label>Cryptocurrency</Label>
                <Select
                  value={newAccountData.details.currency || ''}
                  onValueChange={(value) => setNewAccountData({
                    ...newAccountData,
                    details: { ...newAccountData.details, currency: value }
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select cryptocurrency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="btc">Bitcoin (BTC)</SelectItem>
                    <SelectItem value="eth">Ethereum (ETH)</SelectItem>
                    <SelectItem value="usdt">Tether (USDT)</SelectItem>
                    <SelectItem value="usdc">USD Coin (USDC)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Wallet Address</Label>
                <Input
                  value={newAccountData.details.address || ''}
                  onChange={(e) => setNewAccountData({
                    ...newAccountData,
                    details: { ...newAccountData.details, address: e.target.value }
                  })}
                  placeholder="Enter wallet address"
                />
              </div>
            </>
          )}

          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Your account details are encrypted and stored securely
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setShowAccountDialog(false)}>
            Cancel
          </Button>
          <Button onClick={handleAddAccount}>
            Add Account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (loading) {
    return <div className="text-center py-8">Loading payout information...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Payouts</h2>
          <p className="text-muted-foreground">
            Manage your earnings and payout requests
          </p>
        </div>
        <Button 
          onClick={() => setShowRequestDialog(true)}
          disabled={(summary?.availableBalance || 0) < (summary?.minimumPayout || 0)}
        >
          <Send className="mr-2 h-4 w-4" />
          Request Payout
        </Button>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${summary?.availableBalance?.toFixed(2) || '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              Ready for payout
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Balance</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${summary?.pendingBalance?.toFixed(2) || '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              Processing commissions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Paid Out</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${summary?.totalPaidOut?.toFixed(2) || '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              All time earnings
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Payout Info Alert */}
      {summary?.nextPayoutDate && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertTitle>Next Scheduled Payout</AlertTitle>
          <AlertDescription>
            Your next automatic payout is scheduled for {format(new Date(summary.nextPayoutDate), 'MMMM dd, yyyy')}
            {summary.payoutSchedule !== 'on_demand' && ` (${summary.payoutSchedule} schedule)`}
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="request">Request Payout</TabsTrigger>
          <TabsTrigger value="history">Payout History</TabsTrigger>
          <TabsTrigger value="accounts">Payout Accounts</TabsTrigger>
        </TabsList>

        {/* Request Tab */}
        <TabsContent value="request">
          <Card>
            <CardHeader>
              <CardTitle>Recent Payout Requests</CardTitle>
              <CardDescription>Track the status of your payout requests</CardDescription>
            </CardHeader>
            <CardContent>
              {requests.length === 0 ? (
                <div className="text-center py-8">
                  <Wallet className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No payout requests</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Request a payout when you have sufficient balance
                  </p>
                  <div className="mt-6">
                    <Button 
                      onClick={() => setShowRequestDialog(true)}
                      disabled={(summary?.availableBalance || 0) < (summary?.minimumPayout || 0)}
                    >
                      Request Your First Payout
                    </Button>
                  </div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Request #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Fee</TableHead>
                      <TableHead>Net Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-mono text-sm">
                          {request.requestNumber}
                        </TableCell>
                        <TableCell>
                          {format(new Date(request.requestedAt), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>${request.amount.toFixed(2)}</TableCell>
                        <TableCell className="text-red-600">
                          -${request.fee.toFixed(2)}
                        </TableCell>
                        <TableCell className="font-medium">
                          ${request.netAmount.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {getAccountIcon(request.method)}
                            <span className="text-sm">{request.accountName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(request.status) as any}>
                            <span className="flex items-center gap-1">
                              {getStatusIcon(request.status)}
                              {request.status}
                            </span>
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {request.status === 'pending' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleCancelRequest(request.id)}
                            >
                              Cancel
                            </Button>
                          )}
                          {request.transactionId && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                navigator.clipboard.writeText(request.transactionId || '');
                                toast({
                                  title: 'Copied',
                                  description: 'Transaction ID copied to clipboard'
                                });
                              }}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Payout History</CardTitle>
              <CardDescription>Your earnings history over the last 6 months</CardDescription>
            </CardHeader>
            <CardContent>
              {history && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <p className="text-2xl font-bold">{history.totalRequests}</p>
                      <p className="text-sm text-muted-foreground">Total Requests</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <p className="text-2xl font-bold">{history.successfulPayouts}</p>
                      <p className="text-sm text-muted-foreground">Successful Payouts</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <p className="text-2xl font-bold">${history.totalAmount.toFixed(2)}</p>
                      <p className="text-sm text-muted-foreground">Total Paid Out</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <p className="text-2xl font-bold">${history.averageAmount.toFixed(2)}</p>
                      <p className="text-sm text-muted-foreground">Average Payout</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Monthly Breakdown</h4>
                    {history.lastSixMonths.map((month) => (
                      <div key={month.month} className="flex items-center justify-between p-3 border rounded-lg">
                        <span className="font-medium">{month.month}</span>
                        <div className="text-right">
                          <p className="font-medium">${month.amount.toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">{month.count} payouts</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Accounts Tab */}
        <TabsContent value="accounts">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Payout Accounts</CardTitle>
                  <CardDescription>Manage your payout methods</CardDescription>
                </div>
                <Button onClick={() => setShowAccountDialog(true)}>
                  Add Account
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {accounts.length === 0 ? (
                <div className="text-center py-8">
                  <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No payout accounts</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Add an account to receive your payouts
                  </p>
                  <div className="mt-6">
                    <Button onClick={() => setShowAccountDialog(true)}>
                      Add Your First Account
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {accounts.map((account) => (
                    <div key={account.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="p-2 bg-gray-100 rounded-lg">
                          {getAccountIcon(account.type)}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <p className="font-medium">{account.name}</p>
                            {account.isDefault && (
                              <Badge variant="secondary">Default</Badge>
                            )}
                            {account.isVerified && (
                              <Badge variant="default">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Verified
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {account.type === 'bank' && `****${account.details.accountNumber?.slice(-4)}`}
                            {account.type === 'paypal' && account.details.email}
                            {account.type === 'crypto' && `${account.details.currency?.toUpperCase()}: ${account.details.address?.slice(0, 10)}...`}
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        {!account.isDefault && (
                          <Button size="sm" variant="outline">
                            Set as Default
                          </Button>
                        )}
                        <Button size="sm" variant="ghost">
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <RequestPayoutDialog />
      <AddAccountDialog />
    </div>
  );
};

export default PayoutRequests;