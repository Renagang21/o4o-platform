/**
 * Survey Campaign Edit Page
 *
 * Edit existing survey campaign
 * Phase R10: Supplier Publishing UI
 */

import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ClipboardList, ArrowLeft, Save, Globe, GlobeLock, Plus, Trash2, ExternalLink, BarChart3, StopCircle } from 'lucide-react';
import { AGTabs, type AGTabItem } from '@/components/ag/AGTabs';
import { surveyCampaignApi, type UpdateSurveyCampaignDto, type SurveyCampaign, type SurveyQuestion, type SurveyReward, type TargetAudience } from '@/lib/api/lmsMarketing';

const TARGET_OPTIONS = [
  { value: 'seller', label: 'Sellers' },
  { value: 'consumer', label: 'Consumers' },
  { value: 'pharmacist', label: 'Pharmacists' },
  { value: 'all', label: 'All Users' },
] as const;

const QUESTION_TYPES = [
  { value: 'single_choice', label: 'Single Choice' },
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'text', label: 'Short Text' },
  { value: 'textarea', label: 'Long Text' },
  { value: 'rating', label: 'Rating (1-5)' },
  { value: 'scale', label: 'Scale (1-10)' },
  { value: 'date', label: 'Date' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
] as const;

const REWARD_TYPES = [
  { value: 'points', label: 'Points' },
  { value: 'coupon', label: 'Coupon' },
  { value: 'badge', label: 'Badge' },
] as const;

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-500',
  scheduled: 'bg-blue-500',
  active: 'bg-green-500',
  ended: 'bg-orange-500',
  archived: 'bg-red-500',
};

export default function SurveyEditPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [campaign, setCampaign] = useState<SurveyCampaign | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    bundleId: '',
    allowAnonymous: false,
    maxResponses: '',
    startDate: '',
    endDate: '',
    targets: ['all'] as string[],
    regions: '',
    tags: '',
    sellerTypes: '',
  });

  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [reward, setReward] = useState<SurveyReward | undefined>(undefined);

  useEffect(() => {
    const fetchCampaign = async () => {
      if (!id) return;
      setIsLoading(true);
      try {
        const response = await surveyCampaignApi.get(id);
        if (response.success && response.data) {
          const c = response.data;
          setCampaign(c);
          setFormData({
            title: c.title,
            description: c.description || '',
            bundleId: c.bundleId || '',
            allowAnonymous: c.allowAnonymous || false,
            maxResponses: c.maxResponses?.toString() || '',
            startDate: c.startDate ? new Date(c.startDate).toISOString().slice(0, 16) : '',
            endDate: c.endDate ? new Date(c.endDate).toISOString().slice(0, 16) : '',
            targets: c.targeting.targets || ['all'],
            regions: c.targeting.regions?.join(', ') || '',
            tags: c.targeting.tags?.join(', ') || '',
            sellerTypes: c.targeting.sellerTypes?.join(', ') || '',
          });
          setQuestions(c.questions || []);
          setReward(c.reward);
        } else {
          setError(response.error || 'Failed to load campaign');
        }
      } catch (err) {
        setError('Failed to load campaign');
        console.error('Fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCampaign();
  }, [id]);

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

  const addQuestion = () => {
    const newQuestion: SurveyQuestion = {
      id: `q-${Date.now()}`,
      type: 'single_choice',
      question: '',
      options: [
        { id: `o-${Date.now()}-1`, text: '' },
        { id: `o-${Date.now()}-2`, text: '' },
      ],
      required: false,
      order: questions.length + 1,
    };
    setQuestions([...questions, newQuestion]);
  };

  const updateQuestion = (index: number, updates: Partial<SurveyQuestion>) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], ...updates };
    setQuestions(updated);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const addOption = (questionIndex: number) => {
    const updated = [...questions];
    if (!updated[questionIndex].options) {
      updated[questionIndex].options = [];
    }
    updated[questionIndex].options!.push({
      id: `o-${Date.now()}`,
      text: '',
    });
    setQuestions(updated);
  };

  const updateOption = (questionIndex: number, optionIndex: number, text: string) => {
    const updated = [...questions];
    if (updated[questionIndex].options) {
      updated[questionIndex].options![optionIndex].text = text;
    }
    setQuestions(updated);
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const updated = [...questions];
    if (updated[questionIndex].options) {
      updated[questionIndex].options = updated[questionIndex].options!.filter((_, i) => i !== optionIndex);
    }
    setQuestions(updated);
  };

  const handleSubmit = async () => {
    if (!id || !formData.title.trim()) {
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

    const dto: UpdateSurveyCampaignDto = {
      title: formData.title,
      description: formData.description || undefined,
      bundleId: formData.bundleId || undefined,
      questions,
      targeting,
      reward,
      allowAnonymous: formData.allowAnonymous,
      maxResponses: formData.maxResponses ? parseInt(formData.maxResponses) : undefined,
      startDate: formData.startDate || undefined,
      endDate: formData.endDate || undefined,
    };

    try {
      const response = await surveyCampaignApi.update(id, dto);
      if (response.success) {
        navigate('/admin/marketing/publisher/survey');
      } else {
        setError(response.error || 'Failed to update campaign');
      }
    } catch (err) {
      setError('Failed to update campaign');
      console.error('Update error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePublish = async () => {
    if (!id) return;
    setIsSubmitting(true);
    try {
      const response = await surveyCampaignApi.publish(id);
      if (response.success && response.data) {
        setCampaign(response.data);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnpublish = async () => {
    if (!id) return;
    setIsSubmitting(true);
    try {
      const response = await surveyCampaignApi.unpublish(id);
      if (response.success && response.data) {
        setCampaign(response.data);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEnd = async () => {
    if (!id) return;
    setIsSubmitting(true);
    try {
      const response = await surveyCampaignApi.end(id);
      if (response.success && response.data) {
        setCampaign(response.data);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasOptions = (type: SurveyQuestion['type']) => {
    return type === 'single_choice' || type === 'multiple_choice';
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertDescription>Campaign not found</AlertDescription>
        </Alert>
      </div>
    );
  }

  const isEditable = campaign.status === 'draft';

  const tabs: AGTabItem[] = [
    {
      key: 'basic',
      label: 'Basic Info',
      content: (
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              disabled={!isEditable}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              rows={3}
              disabled={!isEditable}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-4">
              <Switch
                id="anonymous"
                checked={formData.allowAnonymous}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, allowAnonymous: checked }))}
                disabled={!isEditable}
              />
              <Label htmlFor="anonymous">Allow Anonymous Responses</Label>
            </div>
            <div className="space-y-2">
              <Label>Max Responses (Optional)</Label>
              <Input
                type="number"
                value={formData.maxResponses}
                onChange={(e) => setFormData((prev) => ({ ...prev, maxResponses: e.target.value }))}
                placeholder="Unlimited"
                disabled={!isEditable}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Content Bundle ID (Optional)</Label>
            <Input
              value={formData.bundleId}
              onChange={(e) => setFormData((prev) => ({ ...prev, bundleId: e.target.value }))}
              disabled={!isEditable}
            />
          </div>

          {/* Stats for non-draft campaigns */}
          {!isEditable && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg mt-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{(campaign as any).responseCount}</div>
                <div className="text-sm text-muted-foreground">Responses</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{campaign.completionCount}</div>
                <div className="text-sm text-muted-foreground">Completions</div>
              </div>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'questions',
      label: `Questions (${questions.length})`,
      content: (
        <div className="space-y-4 pt-4">
          {questions.map((question, qIndex) => (
            <Card key={question.id} className="p-4">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <Label>Question {qIndex + 1}</Label>
                    <Input
                      value={question.question}
                      onChange={(e) => updateQuestion(qIndex, { question: e.target.value })}
                      disabled={!isEditable}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select
                      value={question.type}
                      onValueChange={(value) => {
                        const newType = value as SurveyQuestion['type'];
                        const updates: Partial<SurveyQuestion> = { type: newType };
                        if (hasOptions(newType) && !question.options?.length) {
                          updates.options = [
                            { id: `o-${Date.now()}-1`, text: '' },
                            { id: `o-${Date.now()}-2`, text: '' },
                          ];
                        }
                        updateQuestion(qIndex, updates);
                      }}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {QUESTION_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center space-x-2 pt-6">
                    <Checkbox
                      id={`required-${qIndex}`}
                      checked={question.required}
                      onCheckedChange={(checked) => updateQuestion(qIndex, { required: checked as boolean })}
                      disabled={!isEditable}
                    />
                    <Label htmlFor={`required-${qIndex}`} className="font-normal text-sm">
                      Required
                    </Label>
                  </div>
                  {isEditable && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 mt-6"
                      onClick={() => removeQuestion(qIndex)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {hasOptions(question.type) && (
                  <div className="space-y-2">
                    <Label>Options</Label>
                    {question.options?.map((option, oIndex) => (
                      <div key={option.id} className="flex items-center gap-2">
                        <Input
                          value={option.text}
                          onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                          className="flex-1"
                          disabled={!isEditable}
                        />
                        {isEditable && (question.options?.length || 0) > 2 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeOption(qIndex, oIndex)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    {isEditable && (
                      <Button variant="outline" size="sm" onClick={() => addOption(qIndex)}>
                        <Plus className="h-4 w-4 mr-1" />
                        Add Option
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </Card>
          ))}

          {isEditable && (
            <Button variant="outline" onClick={addQuestion} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Question
            </Button>
          )}
        </div>
      ),
    },
    {
      key: 'targeting',
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
                    onCheckedChange={(checked) => handleTargetChange(option.value, checked as boolean)}
                    disabled={!isEditable}
                  />
                  <Label htmlFor={`target-${option.value}`} className="font-normal">
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="datetime-local"
                value={formData.startDate}
                onChange={(e) => setFormData((prev) => ({ ...prev, startDate: e.target.value }))}
                disabled={!isEditable}
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="datetime-local"
                value={formData.endDate}
                onChange={(e) => setFormData((prev) => ({ ...prev, endDate: e.target.value }))}
                disabled={!isEditable}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Target Regions (comma-separated)</Label>
            <Input
              value={formData.regions}
              onChange={(e) => setFormData((prev) => ({ ...prev, regions: e.target.value }))}
              placeholder="e.g., Seoul, Busan, Daegu"
              disabled={!isEditable}
            />
          </div>
          <div className="space-y-2">
            <Label>Target Tags (comma-separated)</Label>
            <Input
              value={formData.tags}
              onChange={(e) => setFormData((prev) => ({ ...prev, tags: e.target.value }))}
              placeholder="e.g., premium, new-user"
              disabled={!isEditable}
            />
          </div>
        </div>
      ),
    },
    {
      key: 'reward',
      label: 'Reward',
      content: (
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <Label>Completion Reward</Label>
            {isEditable && !reward && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setReward({ type: 'points', value: '' })}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Reward
              </Button>
            )}
          </div>

          {reward ? (
            <Card className="p-4">
              <div className="grid grid-cols-3 gap-4 items-end">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={reward.type}
                    onValueChange={(value) => setReward({ ...reward, type: value as SurveyReward['type'] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REWARD_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Value</Label>
                  <Input
                    value={reward.value}
                    onChange={(e) => setReward({ ...reward, value: e.target.value })}
                    placeholder={reward.type === 'points' ? 'e.g., 100' : 'e.g., SURVEY10'}
                    disabled={!isEditable}
                  />
                </div>
                {isEditable && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500"
                    onClick={() => setReward(undefined)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </Button>
                )}
              </div>
            </Card>
          ) : (
            <p className="text-muted-foreground text-sm">
              No reward configured. Add a reward to incentivize survey completion.
            </p>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ClipboardList className="h-6 w-6 text-purple-500" />
              Edit Survey Campaign
            </h1>
            <p className="text-muted-foreground">
              {isEditable ? 'Update your survey campaign' : 'View campaign details (read-only)'}
            </p>
          </div>
        </div>
        <Badge className={STATUS_COLORS[campaign.status]}>
          {campaign.status}
        </Badge>
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
          <CardTitle>Survey Campaign Details</CardTitle>
          <CardDescription>
            {isEditable ? 'Configure your survey campaign' : 'Campaign is published and cannot be edited'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AGTabs items={tabs} defaultActiveKey="basic" />

          {/* Actions */}
          <div className="flex justify-between mt-8 pt-6 border-t">
            <div className="flex gap-2">
              {campaign.status === 'draft' && (
                <Button
                  variant="outline"
                  onClick={handlePublish}
                  disabled={isSubmitting || questions.length === 0}
                >
                  <Globe className="h-4 w-4 mr-2" />
                  Publish
                </Button>
              )}
              {campaign.status === 'active' && (
                <>
                  <Button variant="outline" onClick={handleUnpublish} disabled={isSubmitting}>
                    <GlobeLock className="h-4 w-4 mr-2" />
                    Unpublish
                  </Button>
                  <Button variant="outline" onClick={handleEnd} disabled={isSubmitting}>
                    <StopCircle className="h-4 w-4 mr-2" />
                    End Campaign
                  </Button>
                </>
              )}
              <Button variant="ghost" asChild>
                <a href={`/marketing/survey/${campaign.id}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Preview
                </a>
              </Button>
              <Button variant="ghost" asChild>
                <Link to={`/admin/marketing/insights/campaign/survey/${campaign.id}`}>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Insights
                </Link>
              </Button>
            </div>
            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => navigate('/admin/marketing/publisher/survey')}
                disabled={isSubmitting}
              >
                {isEditable ? 'Cancel' : 'Back'}
              </Button>
              {isEditable && (
                <Button onClick={handleSubmit} disabled={isSubmitting}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
