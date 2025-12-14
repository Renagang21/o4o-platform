/**
 * Survey Campaign Create Page
 *
 * Create new survey campaign
 * Phase R10: Supplier Publishing UI
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClipboardList, ArrowLeft, Save, Globe, Plus, Trash2 } from 'lucide-react';
import { AGTabs, type AGTab } from '@/components/ag/AGTabs';
import { surveyCampaignApi, type CreateSurveyCampaignDto, type SurveyQuestion, type SurveyReward, type TargetAudience } from '@/lib/api/lmsMarketing';
import { useAuth } from '@o4o/auth-context';

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
  { value: 'none', label: 'No Reward' },
  { value: 'points', label: 'Points' },
  { value: 'coupon', label: 'Coupon' },
  { value: 'badge', label: 'Badge' },
] as const;

export default function SurveyCreatePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const supplierId = user?.supplierId || user?.id || 'default-supplier';

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
  const [reward, setReward] = useState<SurveyReward>({ type: 'none', value: '' });

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
      required: true,
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
    updated[questionIndex].options![optionIndex].text = text;
    setQuestions(updated);
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const updated = [...questions];
    updated[questionIndex].options = updated[questionIndex].options!.filter((_, i) => i !== optionIndex);
    setQuestions(updated);
  };

  const needsOptions = (type: string) => {
    return ['single_choice', 'multiple_choice'].includes(type);
  };

  const handleSubmit = async (publish = false) => {
    if (!formData.title.trim()) {
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

    const dto: CreateSurveyCampaignDto = {
      supplierId,
      title: formData.title,
      description: formData.description || undefined,
      bundleId: formData.bundleId || undefined,
      questions: questions.length > 0 ? questions : undefined,
      targeting,
      reward: reward.type !== 'none' ? reward : undefined,
      startDate: formData.startDate || undefined,
      endDate: formData.endDate || undefined,
      allowAnonymous: formData.allowAnonymous,
      maxResponses: formData.maxResponses ? parseInt(formData.maxResponses) : undefined,
    };

    try {
      const response = await surveyCampaignApi.create(dto);
      if (response.success && response.data) {
        if (publish && questions.length > 0) {
          await surveyCampaignApi.publish(response.data.id);
        }
        navigate('/admin/marketing/publisher/survey');
      } else {
        setError(response.error || 'Failed to create survey campaign');
      }
    } catch (err) {
      setError('Failed to create survey campaign');
      console.error('Create error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const tabs: AGTab[] = [
    {
      id: 'basic',
      label: 'Basic Info',
      content: (
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Enter survey campaign title"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Describe what this survey is about"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="maxResponses">Max Responses</Label>
              <Input
                id="maxResponses"
                type="number"
                value={formData.maxResponses}
                onChange={(e) => setFormData((prev) => ({ ...prev, maxResponses: e.target.value }))}
                placeholder="Leave empty for unlimited"
              />
            </div>
            <div className="flex items-center space-x-2 pt-8">
              <Switch
                id="allowAnonymous"
                checked={formData.allowAnonymous}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, allowAnonymous: checked }))}
              />
              <Label htmlFor="allowAnonymous">Allow Anonymous Responses</Label>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'questions',
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
                      placeholder="Enter your question"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select
                      value={question.type}
                      onValueChange={(value) => {
                        const updates: Partial<SurveyQuestion> = { type: value as SurveyQuestion['type'] };
                        if (needsOptions(value) && !question.options?.length) {
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
                      checked={question.required}
                      onCheckedChange={(checked) => updateQuestion(qIndex, { required: checked as boolean })}
                    />
                    <Label className="font-normal">Required</Label>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 mt-6"
                    onClick={() => removeQuestion(qIndex)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {needsOptions(question.type) && (
                  <div className="space-y-2">
                    <Label>Options</Label>
                    {question.options?.map((option, oIndex) => (
                      <div key={option.id} className="flex items-center gap-2">
                        <Input
                          value={option.text}
                          onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                          placeholder={`Option ${oIndex + 1}`}
                          className="flex-1"
                        />
                        {(question.options?.length || 0) > 2 && (
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
                    <Button variant="outline" size="sm" onClick={() => addOption(qIndex)}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add Option
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}

          <Button variant="outline" onClick={addQuestion} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Question
          </Button>
        </div>
      ),
    },
    {
      id: 'targeting',
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
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="datetime-local"
                value={formData.startDate}
                onChange={(e) => setFormData((prev) => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="datetime-local"
                value={formData.endDate}
                onChange={(e) => setFormData((prev) => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="regions">Target Regions</Label>
            <Input
              id="regions"
              value={formData.regions}
              onChange={(e) => setFormData((prev) => ({ ...prev, regions: e.target.value }))}
              placeholder="Seoul, Busan (comma-separated)"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              value={formData.tags}
              onChange={(e) => setFormData((prev) => ({ ...prev, tags: e.target.value }))}
              placeholder="feedback, satisfaction (comma-separated)"
            />
          </div>
        </div>
      ),
    },
    {
      id: 'reward',
      label: 'Reward',
      content: (
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Reward Type</Label>
            <Select
              value={reward.type}
              onValueChange={(value) => setReward((prev) => ({ ...prev, type: value as SurveyReward['type'] }))}
            >
              <SelectTrigger className="w-full">
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

          {reward.type !== 'none' && (
            <>
              <div className="space-y-2">
                <Label>Reward Value</Label>
                <Input
                  value={reward.value}
                  onChange={(e) => setReward((prev) => ({ ...prev, value: e.target.value }))}
                  placeholder={reward.type === 'points' ? '100' : 'COUPON123'}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={reward.description || ''}
                  onChange={(e) => setReward((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the reward"
                />
              </div>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-purple-500" />
            Create Survey Campaign
          </h1>
          <p className="text-muted-foreground">
            Build a survey to collect feedback from your audience
          </p>
        </div>
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
            Configure your survey campaign settings and questions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AGTabs tabs={tabs} defaultTab="basic" />

          {/* Actions */}
          <div className="flex justify-end gap-4 mt-8 pt-6 border-t">
            <Button
              variant="outline"
              onClick={() => navigate('/admin/marketing/publisher/survey')}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleSubmit(false)}
              disabled={isSubmitting}
            >
              <Save className="h-4 w-4 mr-2" />
              Save as Draft
            </Button>
            <Button
              onClick={() => handleSubmit(true)}
              disabled={isSubmitting || questions.length === 0}
            >
              <Globe className="h-4 w-4 mr-2" />
              Save & Publish
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
