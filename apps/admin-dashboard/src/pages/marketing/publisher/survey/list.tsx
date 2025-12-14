/**
 * Survey Campaign List Page
 *
 * List all survey campaigns for the supplier
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
  ClipboardList,
  Edit,
  Trash2,
  Globe,
  GlobeLock,
  Users,
  BarChart3,
  StopCircle,
} from 'lucide-react';
import { AGTable, type AGTableColumn } from '@/components/ag/AGTable';
import { AGModal } from '@/components/ag/AGModal';
import { surveyCampaignApi, type SurveyCampaign } from '@/lib/api/lmsMarketing';
import { useAuth } from '@o4o/auth-context';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-500',
  scheduled: 'bg-blue-500',
  active: 'bg-green-500',
  ended: 'bg-orange-500',
  archived: 'bg-red-500',
};

export default function SurveyListPage() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<SurveyCampaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; campaign: SurveyCampaign | null }>({
    open: false,
    campaign: null,
  });

  const supplierId = user?.supplierId || user?.id || 'default-supplier';

  const fetchCampaigns = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await surveyCampaignApi.list(supplierId);
      if (response.success && response.data) {
        setCampaigns(response.data.data || []);
      } else {
        setError(response.error || 'Failed to load campaigns');
      }
    } catch (err) {
      setError('Failed to load campaigns');
      console.error('Campaign fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, [supplierId]);

  const handlePublish = async (id: string) => {
    const response = await surveyCampaignApi.publish(id);
    if (response.success) {
      fetchCampaigns();
    }
  };

  const handleUnpublish = async (id: string) => {
    const response = await surveyCampaignApi.unpublish(id);
    if (response.success) {
      fetchCampaigns();
    }
  };

  const handleEnd = async (id: string) => {
    const response = await surveyCampaignApi.end(id);
    if (response.success) {
      fetchCampaigns();
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.campaign) return;
    const response = await surveyCampaignApi.delete(deleteModal.campaign.id);
    if (response.success) {
      setDeleteModal({ open: false, campaign: null });
      fetchCampaigns();
    }
  };

  const columns: AGTableColumn<SurveyCampaign>[] = [
    {
      key: 'title',
      header: 'Title',
      sortable: true,
      render: (campaign) => (
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-purple-500" />
          <div>
            <span className="font-medium">{campaign.title}</span>
            <p className="text-xs text-muted-foreground">
              {campaign.questions.length} questions
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (campaign) => (
        <Badge className={STATUS_COLORS[campaign.status]}>
          {campaign.status}
        </Badge>
      ),
    },
    {
      key: 'responses',
      header: 'Responses',
      render: (campaign) => (
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span>{campaign.completionCount}</span>
          {campaign.maxResponses && (
            <span className="text-muted-foreground">/ {campaign.maxResponses}</span>
          )}
        </div>
      ),
    },
    {
      key: 'anonymous',
      header: 'Anonymous',
      render: (campaign) => (
        <Badge variant={campaign.allowAnonymous ? 'default' : 'secondary'}>
          {campaign.allowAnonymous ? 'Yes' : 'No'}
        </Badge>
      ),
    },
    {
      key: 'schedule',
      header: 'Schedule',
      render: (campaign) => (
        <div className="text-sm">
          {campaign.startDate && (
            <div className="text-muted-foreground">
              Start: {new Date(campaign.startDate).toLocaleDateString()}
            </div>
          )}
          {campaign.endDate && (
            <div className="text-muted-foreground">
              End: {new Date(campaign.endDate).toLocaleDateString()}
            </div>
          )}
          {!campaign.startDate && !campaign.endDate && (
            <span className="text-muted-foreground">No schedule</span>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (campaign) => (
        <div className="flex items-center gap-1">
          <Button asChild size="sm" variant="ghost">
            <Link to={`/admin/marketing/publisher/survey/${campaign.id}`}>
              <Edit className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link to={`/admin/marketing/insights/campaign/survey/${campaign.id}`}>
              <BarChart3 className="h-4 w-4" />
            </Link>
          </Button>
          {campaign.status === 'draft' && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handlePublish(campaign.id)}
            >
              <Globe className="h-4 w-4" />
            </Button>
          )}
          {campaign.status === 'active' && (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleUnpublish(campaign.id)}
              >
                <GlobeLock className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleEnd(campaign.id)}
              >
                <StopCircle className="h-4 w-4" />
              </Button>
            </>
          )}
          {campaign.status === 'draft' && (
            <Button
              size="sm"
              variant="ghost"
              className="text-red-500 hover:text-red-600"
              onClick={() => setDeleteModal({ open: true, campaign })}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
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
            <ClipboardList className="h-6 w-6 text-purple-500" />
            Survey Campaigns
          </h1>
          <p className="text-muted-foreground">
            Create and manage survey campaigns to collect feedback
          </p>
        </div>
        <Button asChild>
          <Link to="/admin/marketing/publisher/survey/create">
            <Plus className="h-4 w-4 mr-2" />
            Create Survey Campaign
          </Link>
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Survey Campaigns</CardTitle>
          <CardDescription>
            {campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''} total
          </CardDescription>
        </CardHeader>
        <CardContent>
          {campaigns.length === 0 ? (
            <div className="text-center py-12">
              <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No survey campaigns yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first survey campaign to collect feedback
              </p>
              <Button asChild>
                <Link to="/admin/marketing/publisher/survey/create">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Survey Campaign
                </Link>
              </Button>
            </div>
          ) : (
            <AGTable
              data={campaigns}
              columns={columns}
              keyField="id"
            />
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      <AGModal
        open={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, campaign: null })}
        title="Delete Survey Campaign"
        description={`Are you sure you want to delete "${deleteModal.campaign?.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
