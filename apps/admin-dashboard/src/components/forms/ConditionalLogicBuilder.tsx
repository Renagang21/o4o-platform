import { FC } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import type { ConditionalLogic, ConditionalRule, FormField } from '@o4o/types';

interface ConditionalLogicBuilderProps {
  logic?: ConditionalLogic;
  fields: FormField[];
  onChange: (logic: ConditionalLogic) => void;
}

export const ConditionalLogicBuilder: FC<ConditionalLogicBuilderProps> = ({
  logic = { enabled: false, action: 'show', logicType: 'all', rules: [] },
  fields,
  onChange,
}) => {
  const addRule = () => {
    const newRule: ConditionalRule = {
      field: '',
      operator: 'equals',
      value: '',
    };
    onChange({
      ...logic,
      rules: [...logic.rules, newRule],
    });
  };

  const updateRule = (index: number, updates: Partial<ConditionalRule>) => {
    const newRules = [...logic.rules];
    newRules[index] = { ...newRules[index], ...updates };
    onChange({ ...logic, rules: newRules });
  };

  const removeRule = (index: number) => {
    onChange({
      ...logic,
      rules: logic.rules.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Select
          value={logic.action}
          onValueChange={(value: string) => onChange({ ...logic, action: value as 'show' | 'hide' })}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="show">Show</SelectItem>
            <SelectItem value="hide">Hide</SelectItem>
          </SelectContent>
        </Select>
        <span>this field if</span>
        <Select
          value={logic.logicType}
          onValueChange={(value: string) => onChange({ ...logic, logicType: value as 'all' | 'any' })}
        >
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="any">Any</SelectItem>
          </SelectContent>
        </Select>
        <span>of the following rules match:</span>
      </div>

      <div className="space-y-2">
        {logic.rules.map((rule, index) => (
          <div key={index} className="flex items-center gap-2">
            <Select
              value={rule.field}
              onValueChange={(value: string) => updateRule(index, { field: value })}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select field" />
              </SelectTrigger>
              <SelectContent>
                {fields.map((field) => (
                  <SelectItem key={field.id} value={field.id}>
                    {field.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={rule.operator}
              onValueChange={(value: string) => updateRule(index, { operator: value as ConditionalRule['operator'] })}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="equals">Equals</SelectItem>
                <SelectItem value="not_equals">Not equals</SelectItem>
                <SelectItem value="contains">Contains</SelectItem>
                <SelectItem value="not_contains">Not contains</SelectItem>
                <SelectItem value="starts_with">Starts with</SelectItem>
                <SelectItem value="ends_with">Ends with</SelectItem>
                <SelectItem value="greater_than">Greater than</SelectItem>
                <SelectItem value="less_than">Less than</SelectItem>
                <SelectItem value="is_empty">Is empty</SelectItem>
                <SelectItem value="is_not_empty">Is not empty</SelectItem>
              </SelectContent>
            </Select>

            {rule.operator !== 'is_empty' && rule.operator !== 'is_not_empty' && (
              <Input
                value={rule.value}
                onChange={(e) => updateRule(index, { value: e.target.value })}
                placeholder="Value"
                className="flex-1"
              />
            )}

            <Button
              variant={"ghost" as const}
              size={"icon" as const}
              onClick={() => removeRule(index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <Button
        variant={"outline" as const}
        size={"sm" as const}
        onClick={addRule}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Rule
      </Button>
    </div>
  );
};