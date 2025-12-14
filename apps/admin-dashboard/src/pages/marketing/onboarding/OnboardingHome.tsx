/**
 * Onboarding Home Page
 *
 * Main onboarding dashboard for suppliers
 * Phase R11: Supplier Onboarding System
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Rocket,
  CheckCircle2,
  Circle,
  ArrowRight,
  User,
  FileText,
  FileQuestion,
  ClipboardList,
  BarChart3,
} from 'lucide-react';
import {
  onboardingApi,
  type SupplierProfile,
  type OnboardingChecklistResponse,
} from '@/lib/api/lmsMarketing';
import { useAuth } from '@o4o/auth-context';

const CHECKLIST_ICONS: Record<string, React.ReactNode> = {
  profile: <User className="h-5 w-5" />,
  first_product: <FileText className="h-5 w-5" />,
  first_quiz: <FileQuestion className="h-5 w-5" />,
  first_survey: <ClipboardList className="h-5 w-5" />,
  view_dashboard: <BarChart3 className="h-5 w-5" />,
};

const CHECKLIST_ROUTES: Record<string, string> = {
  profile: '/admin/marketing/onboarding/profile',
  first_product: '/admin/marketing/publisher/product/create',
  first_quiz: '/admin/marketing/publisher/quiz/create',
  first_survey: '/admin/marketing/publisher/survey/create',
  view_dashboard: '/admin/marketing/publisher',
};

export default function OnboardingHome() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<SupplierProfile | null>(null);
  const [checklist, setChecklist] = useState<OnboardingChecklistResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supplierId = user?.supplierId || user?.id || 'default-supplier';

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [profileRes, checklistRes] = await Promise.all([
          onboardingApi.getProfile(supplierId),
          onboardingApi.getChecklist(supplierId),
        ]);

        if (profileRes.success && profileRes.data) {
          setProfile(profileRes.data);
        }
        if (checklistRes.success && checklistRes.data) {
          setChecklist(checklistRes.data);
        }
      } catch (err) {
        setError('Failed to load onboarding data');
        console.error('Onboarding fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [supplierId]);

  const handleMarkComplete = async () => {
    const response = await onboardingApi.markComplete(supplierId);
    if (response.success && response.data) {
      setProfile(response.data);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const isCompleted = profile?.onboardingStatus === 'completed';

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Rocket className="h-6 w-6 text-primary" />
            Supplier Onboarding
          </h1>
          <p className="text-muted-foreground">
            Complete your setup to start creating marketing campaigns
          </p>
        </div>
        <Badge
          variant={isCompleted ? 'default' : 'secondary'}
          className={isCompleted ? 'bg-green-500' : ''}
        >
          {profile?.onboardingStatus === 'not_started' && 'Not Started'}
          {profile?.onboardingStatus === 'in_progress' && 'In Progress'}
          {profile?.onboardingStatus === 'completed' && 'Completed'}
        </Badge>
      </div>

      {/* Progress Card */}
      <Card>
        <CardHeader>
          <CardTitle>Your Progress</CardTitle>
          <CardDescription>
            {checklist?.completedCount || 0} of {checklist?.totalCount || 5} steps completed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Progress value={checklist?.progressPercent || 0} className="h-3" />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{checklist?.progressPercent || 0}% complete</span>
              {isCompleted ? (
                <span className="text-green-600 font-medium">All done!</span>
              ) : (
                <span>Keep going!</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Checklist */}
      <Card>
        <CardHeader>
          <CardTitle>Getting Started Checklist</CardTitle>
          <CardDescription>
            Complete these steps to unlock the full potential of the marketing platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {checklist?.items.map((item) => (
              <div
                key={item.id}
                className={`flex items-center justify-between p-4 rounded-lg border ${
                  item.completed ? 'bg-green-50 border-green-200' : 'bg-white'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`p-2 rounded-full ${
                      item.completed
                        ? 'bg-green-100 text-green-600'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {CHECKLIST_ICONS[item.id] || <Circle className="h-5 w-5" />}
                  </div>
                  <div>
                    <p className={`font-medium ${item.completed ? 'text-green-700' : ''}`}>
                      {item.label}
                    </p>
                    {item.completed && item.completedAt && (
                      <p className="text-xs text-muted-foreground">
                        Completed {new Date(item.completedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {item.completed ? (
                    <CheckCircle2 className="h-6 w-6 text-green-500" />
                  ) : (
                    <Button asChild size="sm">
                      <Link to={CHECKLIST_ROUTES[item.id] || '#'}>
                        Start
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      {!isCompleted && checklist?.progressPercent === 100 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">All steps completed!</h3>
                <p className="text-sm text-muted-foreground">
                  Mark your onboarding as complete to finish.
                </p>
              </div>
              <Button onClick={handleMarkComplete}>
                Complete Onboarding
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex gap-4">
        <Button asChild variant="outline">
          <Link to="/admin/marketing/onboarding/profile">
            <User className="h-4 w-4 mr-2" />
            Edit Profile
          </Link>
        </Button>
        <Button asChild>
          <Link to="/admin/marketing/publisher">
            <ArrowRight className="h-4 w-4 mr-2" />
            Go to Publisher
          </Link>
        </Button>
      </div>
    </div>
  );
}
