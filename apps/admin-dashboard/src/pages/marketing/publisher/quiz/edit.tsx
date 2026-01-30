/**
 * Quiz Campaign Edit Page
 *
 * Edit existing quiz campaign
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
import { FileQuestion, ArrowLeft, Save, Globe, GlobeLock, Plus, Trash2, ExternalLink, BarChart3, StopCircle } from 'lucide-react';
import { AGTabs, type AGTabItem } from '@/components/ag/AGTabs';
import { quizCampaignApi, type UpdateQuizCampaignDto, type QuizCampaign, type QuizQuestion, type QuizReward, type TargetAudience } from '@/lib/api/lmsMarketing';

const TARGET_OPTIONS = [
  { value: 'seller', label: 'Sellers' },
  { value: 'consumer', label: 'Consumers' },
  { value: 'pharmacist', label: 'Pharmacists' },
  { value: 'all', label: 'All Users' },
] as const;

const QUESTION_TYPES = [
  { value: 'single_choice', label: 'Single Choice' },
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'true_false', label: 'True/False' },
] as const;

const REWARD_TYPES = [
  { value: 'points', label: 'Points' },
  { value: 'coupon', label: 'Coupon' },
  { value: 'badge', label: 'Badge' },
  { value: 'certificate', label: 'Certificate' },
] as const;

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-500',
  scheduled: 'bg-blue-500',
  active: 'bg-green-500',
  ended: 'bg-orange-500',
  archived: 'bg-red-500',
};

export default function QuizEditPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [campaign, setCampaign] = useState<QuizCampaign | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    bundleId: '',
    passScorePercent: 70,
    startDate: '',
    endDate: '',
    targets: ['all'] as string[],
    regions: '',
    tags: '',
    sellerTypes: '',
  });

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [rewards, setRewards] = useState<QuizReward[]>([]);

  useEffect(() => {
    const fetchCampaign = async () => {
      if (!id) return;
      setIsLoading(true);
      try {
        const response = await quizCampaignApi.get(id);
        if (response.success && response.data) {
          const c = response.data;
          setCampaign(c);
          setFormData({
            title: c.title,
            description: c.description || '',
            bundleId: c.bundleId || '',
            passScorePercent: c.passScorePercent,
            startDate: c.startDate ? new Date(c.startDate).toISOString().slice(0, 16) : '',
            endDate: c.endDate ? new Date(c.endDate).toISOString().slice(0, 16) : '',
            targets: c.targeting.targets || ['all'],
            regions: c.targeting.regions?.join(', ') || '',
            tags: c.targeting.tags?.join(', ') || '',
            sellerTypes: c.targeting.sellerTypes?.join(', ') || '',
          });
          setQuestions(c.questions || []);
          setRewards(c.rewards || []);
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
    const newQuestion: QuizQuestion = {
      id: `q-${Date.now()}`,
      type: 'single_choice',
      question: '',
      options: [
        { id: `o-${Date.now()}-1`, text: '' },
        { id: `o-${Date.now()}-2`, text: '' },
      ],
      correctAnswers: [],
      points: 10,
      order: questions.length + 1,
    };
    setQuestions([...questions, newQuestion]);
  };

  const updateQuestion = (index: number, updates: Partial<QuizQuestion>) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], ...updates };
    setQuestions(updated);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const addOption = (questionIndex: number) => {
    const updated = [...questions];
    updated[questionIndex].options.push({
      id: `o-${Date.now()}`,
      text: '',
    });
    setQuestions(updated);
  };

  const updateOption = (questionIndex: number, optionIndex: number, text: string) => {
    const updated = [...questions];
    updated[questionIndex].options[optionIndex].text = text;
    setQuestions(updated);
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const updated = [...questions];
    updated[questionIndex].options = updated[questionIndex].options.filter((_, i) => i !== optionIndex);
    setQuestions(updated);
  };

  const toggleCorrectAnswer = (questionIndex: number, optionId: string) => {
    const updated = [...questions];
    const q = updated[questionIndex];
    if (q.type === 'single_choice' || q.type === 'true_false') {
      q.correctAnswers = [optionId];
    } else {
      if (q.correctAnswers.includes(optionId)) {
        q.correctAnswers = q.correctAnswers.filter((id) => id !== optionId);
      } else {
        q.correctAnswers.push(optionId);
      }
    }
    setQuestions(updated);
  };

  const addReward = () => {
    setRewards([...rewards, { type: 'points', value: '', minScorePercent: 70 }]);
  };

  const updateReward = (index: number, updates: Partial<QuizReward>) => {
    const updated = [...rewards];
    updated[index] = { ...updated[index], ...updates };
    setRewards(updated);
  };

  const removeReward = (index: number) => {
    setRewards(rewards.filter((_, i) => i !== index));
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

    const dto: UpdateQuizCampaignDto = {
      title: formData.title,
      description: formData.description || undefined,
      bundleId: formData.bundleId || undefined,
      questions,
      targeting,
      rewards: rewards.length > 0 ? rewards : undefined,
      startDate: formData.startDate || undefined,
      endDate: formData.endDate || undefined,
      passScorePercent: formData.passScorePercent,
    };

    try {
      const response = await quizCampaignApi.update(id, dto);
      if (response.success) {
        navigate('/admin/marketing/publisher/quiz');
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
      const response = await quizCampaignApi.publish(id);
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
      const response = await quizCampaignApi.unpublish(id);
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
      const response = await quizCampaignApi.end(id);
      if (response.success && response.data) {
        setCampaign(response.data);
      }
    } finally {
      setIsSubmitting(false);
    }
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
            <div className="space-y-2">
              <Label>Pass Score (%)</Label>
              <Input
                type="number"
                value={formData.passScorePercent}
                onChange={(e) => setFormData((prev) => ({ ...prev, passScorePercent: parseInt(e.target.value) || 0 }))}
                disabled={!isEditable}
              />
            </div>
            <div className="space-y-2">
              <Label>Content Bundle ID</Label>
              <Input
                value={formData.bundleId}
                onChange={(e) => setFormData((prev) => ({ ...prev, bundleId: e.target.value }))}
                disabled={!isEditable}
              />
            </div>
          </div>

          {/* Stats for non-draft campaigns */}
          {!isEditable && (
            <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg mt-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{campaign.participationCount}</div>
                <div className="text-sm text-muted-foreground">Participants</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{campaign.completionCount}</div>
                <div className="text-sm text-muted-foreground">Completions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{Number(campaign.averageScore).toFixed(1)}%</div>
                <div className="text-sm text-muted-foreground">Avg Score</div>
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
                      onValueChange={(value) => updateQuestion(qIndex, { type: value as QuizQuestion['type'] })}
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

                <div className="space-y-2">
                  <Label>Options</Label>
                  {question.options.map((option, oIndex) => (
                    <div key={option.id} className="flex items-center gap-2">
                      <Checkbox
                        checked={question.correctAnswers.includes(option.id)}
                        onCheckedChange={() => toggleCorrectAnswer(qIndex, option.id)}
                        disabled={!isEditable}
                      />
                      <Input
                        value={option.text}
                        onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                        className="flex-1"
                        disabled={!isEditable}
                      />
                      {isEditable && question.options.length > 2 && (
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
            <Label>Target Regions</Label>
            <Input
              value={formData.regions}
              onChange={(e) => setFormData((prev) => ({ ...prev, regions: e.target.value }))}
              disabled={!isEditable}
            />
          </div>
        </div>
      ),
    },
    {
      key: 'rewards',
      label: `Rewards (${rewards.length})`,
      content: (
        <div className="space-y-4 pt-4">
          {rewards.map((reward, index) => (
            <Card key={index} className="p-4">
              <div className="grid grid-cols-4 gap-4 items-end">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={reward.type}
                    onValueChange={(value) => updateReward(index, { type: value as QuizReward['type'] })}
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
                    onChange={(e) => updateReward(index, { value: e.target.value })}
                    disabled={!isEditable}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Min Score %</Label>
                  <Input
                    type="number"
                    value={reward.minScorePercent}
                    onChange={(e) => updateReward(index, { minScorePercent: parseInt(e.target.value) || 0 })}
                    disabled={!isEditable}
                  />
                </div>
                {isEditable && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500"
                    onClick={() => removeReward(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </Card>
          ))}

          {isEditable && (
            <Button variant="outline" onClick={addReward} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Reward
            </Button>
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
              <FileQuestion className="h-6 w-6 text-green-500" />
              Edit Quiz Campaign
            </h1>
            <p className="text-muted-foreground">
              {isEditable ? 'Update your quiz campaign' : 'View campaign details (read-only)'}
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
          <CardTitle>Quiz Campaign Details</CardTitle>
          <CardDescription>
            {isEditable ? 'Configure your quiz campaign' : 'Campaign is published and cannot be edited'}
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
                <a href={`/marketing/quiz/${campaign.id}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Preview
                </a>
              </Button>
              <Button variant="ghost" asChild>
                <Link to={`/admin/marketing/insights/campaign/quiz/${campaign.id}`}>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Insights
                </Link>
              </Button>
            </div>
            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => navigate('/admin/marketing/publisher/quiz')}
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
