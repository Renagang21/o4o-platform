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
// import { format } from 'date-fns';

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
  accountId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  requestedAt: string;
  processedAt?: string;
  completedAt?: string;
  note?: string;
  rejectionReason?: string;
}

interface PayoutHistory {
  id: string;
  amount: number;
  status: 'completed' | 'failed';
  completedAt: string;
  accountName: string;
  transactionId?: string;
}

interface PayoutSummary {
  availableBalance: number;
  pendingPayouts: number;
  completedThisMonth: number;
  totalEarnings: number;
  minimumPayout: number;
  processingFee: number;
}

interface PayoutRequestsProps {
  /**
   * Role type: 'partner' or 'affiliate'
   * Used to construct API endpoints
   */
  roleType: 'partner' | 'affiliate';
}

/**
 * Shared PayoutRequests Component
 *
 * Unified component for both Partner and Affiliate payout management.
 * Only difference is the API endpoint prefix.
 */
const PayoutRequests: React.FC<PayoutRequestsProps> = ({ roleType = 'partner' }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('requests');

  // Data states
  const [summary, setSummary] = useState<PayoutSummary>({
    availableBalance: 0,
    pendingPayouts: 0,
    completedThisMonth: 0,
    totalEarnings: 0,
    minimumPayout: 100,
    processingFee: 2.9
  });
  const [accounts, setAccounts] = useState<PayoutAccount[]>([]);
  const [requests, setRequests] = useState<PayoutRequest[]>([]);
  const [history, setHistory] = useState<PayoutHistory[]>([]);

  // Dialog states
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [showAccountDialog, setShowAccountDialog] = useState(false);

  // Form states
  const [requestAmount, setRequestAmount] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [requestNote, setRequestNote] = useState('');

  // New account form
  const [newAccount, setNewAccount] = useState({
    type: 'bank' as 'bank' | 'paypal' | 'stripe' | 'crypto',
    name: '',
    details: {} as Record<string, string>
  });

  /**
   * Construct API endpoint based on role type
   */
  const getApiEndpoint = (path: string) => {
    return `/api/v1/dropshipping/${roleType}/payout${path}`;
  };

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [roleType]);

  const loadData = async () => {
    try {
      setLoading(true);

      const [summaryRes, accountsRes, requestsRes, historyRes] = await Promise.all([
        fetch(getApiEndpoint('/summary'), {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch(getApiEndpoint('/accounts'), {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch(getApiEndpoint('/requests'), {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch(getApiEndpoint('/history'), {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
      ]);

      if (summaryRes.ok) {
        const data = await summaryRes.json();
        setSummary(data);
      }

      if (accountsRes.ok) {
        const data = await accountsRes.json();
        setAccounts(data);
      }

      if (requestsRes.ok) {
        const data = await requestsRes.json();
        setRequests(data);
      }

      if (historyRes.ok) {
        const data = await historyRes.json();
        setHistory(data);
      }
    } catch (error) {
      console.error('Error loading payout data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load payout data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPayout = async () => {
    const amount = parseFloat(requestAmount);

    // Validation
    if (!amount || amount <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid payout amount',
        variant: 'destructive'
      });
      return;
    }

    if (amount < summary.minimumPayout) {
      toast({
        title: 'Minimum Not Met',
        description: `Minimum payout amount is $${summary.minimumPayout}`,
        variant: 'destructive'
      });
      return;
    }

    if (amount > summary.availableBalance) {
      toast({
        title: 'Insufficient Balance',
        description: 'Payout amount exceeds available balance',
        variant: 'destructive'
      });
      return;
    }

    if (!selectedAccount) {
      toast({
        title: 'No Account Selected',
        description: 'Please select a payout account',
        variant: 'destructive'
      });
      return;
    }

    try {
      const response = await fetch(getApiEndpoint('/request'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          amount,
          accountId: selectedAccount,
          note: requestNote
        })
      });

      if (response.ok) {
        toast({
          title: 'Payout Requested',
          description: 'Your payout request has been submitted successfully'
        });
        setShowRequestDialog(false);
        setRequestAmount('');
        setSelectedAccount('');
        setRequestNote('');
        loadData();
      } else {
        throw new Error('Failed to submit payout request');
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
      const response = await fetch(getApiEndpoint('/accounts'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newAccount)
      });

      if (response.ok) {
        toast({
          title: 'Account Added',
          description: 'Payout account has been added successfully'
        });
        setShowAccountDialog(false);
        setNewAccount({
          type: 'bank',
          name: '',
          details: {}
        });
        loadData();
      } else {
        throw new Error('Failed to add payout account');
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
      const response = await fetch(getApiEndpoint(`/requests/${requestId}/cancel`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        toast({
          title: 'Request Cancelled',
          description: 'Payout request has been cancelled'
        });
        loadData();
      } else {
        throw new Error('Failed to cancel payout request');
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

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };

    return (
      <Badge className={variants[status as keyof typeof variants] || variants.pending}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${summary.availableBalance.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Ready to withdraw</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payouts</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${summary.pendingPayouts.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Being processed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${summary.completedThisMonth.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Completed payouts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${summary.totalEarnings.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
      </div>

      {/* Payout Information Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Payout Information</AlertTitle>
        <AlertDescription>
          Minimum payout: ${summary.minimumPayout} • Processing fee: {summary.processingFee}% •
          Payouts are processed within 3-5 business days
        </AlertDescription>
      </Alert>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="requests">Payout Requests</TabsTrigger>
            <TabsTrigger value="accounts">Payout Accounts</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          {activeTab === 'requests' && (
            <Button onClick={() => setShowRequestDialog(true)}>
              <Send className="mr-2 h-4 w-4" />
              Request Payout
            </Button>
          )}

          {activeTab === 'accounts' && (
            <Button onClick={() => setShowAccountDialog(true)}>
              <CreditCard className="mr-2 h-4 w-4" />
              Add Account
            </Button>
          )}
        </div>

        {/* Payout Requests Tab */}
        <TabsContent value="requests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Payout Requests</CardTitle>
              <CardDescription>
                View and manage your payout requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              {requests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No payout requests yet
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Request #</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Requested</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-mono">{request.requestNumber}</TableCell>
                        <TableCell className="font-medium">${request.amount.toFixed(2)}</TableCell>
                        <TableCell>
                          {accounts.find(a => a.id === request.accountId)?.name || 'N/A'}
                        </TableCell>
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                        <TableCell>{new Date(request.requestedAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          {request.status === 'pending' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCancelRequest(request.id)}
                            >
                              Cancel
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

        {/* Payout Accounts Tab */}
        <TabsContent value="accounts" className="space-y-4">
          <div className="grid gap-4">
            {accounts.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8 text-muted-foreground">
                  No payout accounts configured
                </CardContent>
              </Card>
            ) : (
              accounts.map((account) => (
                <Card key={account.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getAccountIcon(account.type)}
                        <div>
                          <CardTitle className="text-base">{account.name}</CardTitle>
                          <CardDescription className="capitalize">{account.type} Account</CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {account.isDefault && <Badge>Default</Badge>}
                        {account.isVerified ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <Clock className="h-5 w-5 text-yellow-500" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      {Object.entries(account.details).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-muted-foreground capitalize">{key}:</span>
                          <span className="font-mono">{value}</span>
                        </div>
                      ))}
                      {account.lastUsed && (
                        <div className="flex justify-between text-xs text-muted-foreground pt-2 border-t">
                          <span>Last used:</span>
                          <span>{new Date(account.lastUsed).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payout History</CardTitle>
              <CardDescription>
                View your completed payouts
              </CardDescription>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No payout history yet
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Transaction ID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{new Date(item.completedAt).toLocaleDateString()}</TableCell>
                        <TableCell className="font-medium">${item.amount.toFixed(2)}</TableCell>
                        <TableCell>{item.accountName}</TableCell>
                        <TableCell>{getStatusBadge(item.status)}</TableCell>
                        <TableCell>
                          {item.transactionId ? (
                            <div className="flex items-center space-x-2">
                              <code className="text-xs">{item.transactionId}</code>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  navigator.clipboard.writeText(item.transactionId!);
                                  toast({ title: 'Copied to clipboard' });
                                }}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            'N/A'
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
      </Tabs>

      {/* Request Payout Dialog */}
      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Payout</DialogTitle>
            <DialogDescription>
              Submit a new payout request. Minimum amount: ${summary.minimumPayout}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={requestAmount}
                onChange={(e) => setRequestAmount(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Available: ${summary.availableBalance.toFixed(2)}
              </p>
            </div>

            <div>
              <Label htmlFor="account">Payout Account</Label>
              <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.filter(a => a.isVerified).map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name} ({account.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="note">Note (Optional)</Label>
              <Textarea
                id="note"
                placeholder="Add a note for this payout"
                value={requestNote}
                onChange={(e) => setRequestNote(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRequestDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleRequestPayout}>
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Account Dialog */}
      <Dialog open={showAccountDialog} onOpenChange={setShowAccountDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Payout Account</DialogTitle>
            <DialogDescription>
              Add a new account to receive payouts
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="accountType">Account Type</Label>
              <Select
                value={newAccount.type}
                onValueChange={(value: any) => setNewAccount({ ...newAccount, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank">Bank Account</SelectItem>
                  <SelectItem value="paypal">PayPal</SelectItem>
                  <SelectItem value="stripe">Stripe</SelectItem>
                  <SelectItem value="crypto">Crypto Wallet</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="accountName">Account Name</Label>
              <Input
                id="accountName"
                placeholder="My Bank Account"
                value={newAccount.name}
                onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
              />
            </div>

            {/* Dynamic fields based on account type */}
            {newAccount.type === 'bank' && (
              <>
                <div>
                  <Label>Account Number</Label>
                  <Input
                    placeholder="1234567890"
                    onChange={(e) => setNewAccount({
                      ...newAccount,
                      details: { ...newAccount.details, accountNumber: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <Label>Routing Number</Label>
                  <Input
                    placeholder="123456789"
                    onChange={(e) => setNewAccount({
                      ...newAccount,
                      details: { ...newAccount.details, routingNumber: e.target.value }
                    })}
                  />
                </div>
              </>
            )}

            {newAccount.type === 'paypal' && (
              <div>
                <Label>PayPal Email</Label>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  onChange={(e) => setNewAccount({
                    ...newAccount,
                    details: { email: e.target.value }
                  })}
                />
              </div>
            )}

            {newAccount.type === 'crypto' && (
              <>
                <div>
                  <Label>Wallet Address</Label>
                  <Input
                    placeholder="0x..."
                    onChange={(e) => setNewAccount({
                      ...newAccount,
                      details: { ...newAccount.details, address: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <Label>Network</Label>
                  <Select
                    onValueChange={(value) => setNewAccount({
                      ...newAccount,
                      details: { ...newAccount.details, network: value }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select network" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ethereum">Ethereum</SelectItem>
                      <SelectItem value="bitcoin">Bitcoin</SelectItem>
                      <SelectItem value="usdt">USDT (TRC20)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
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
    </div>
  );
};

export default PayoutRequests;
