import { FC } from 'react';
import { Save, Code, Layers } from 'lucide-react';
import type { EnhancedView, FilterGroup } from '../../../types/enhanced-views';

interface EnhancedViewCreateFormProps {
  formData: Partial<EnhancedView>;
  queryBuilderMode: 'visual' | 'sql';
  onQueryBuilderModeChange: (mode: 'visual' | 'sql') => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export const EnhancedViewCreateForm: FC<EnhancedViewCreateFormProps> = ({
  formData,
  queryBuilderMode,
  onQueryBuilderModeChange,
  onSubmit,
  onCancel
}) => {
  const generateSQL = (view: Partial<EnhancedView>): string => {
    if (!view.query) return '';

    const { source, select, where, groupBy, orderBy, limit, distinct } = view.query;

    let sql = 'SELECT ';

    // DISTINCT
    if (distinct) sql += 'DISTINCT ';

    // SELECT clause
    const selectParts = [];
    if (select.fields?.length) {
      selectParts.push(...select.fields);
    }
    if (select.aggregates?.length) {
      selectParts.push(...select.aggregates.map(agg =>
        `${agg.function}(${agg.distinct ? 'DISTINCT ' : ''}${agg.field}) AS ${agg.alias}`
      ));
    }
    if (select.expressions?.length) {
      selectParts.push(...select.expressions.map(exp =>
        `${exp.expression} AS ${exp.alias}`
      ));
    }
    sql += selectParts.join(', ');

    // FROM clause
    sql += `\nFROM ${source.tables[0]}`;

    // JOIN clauses
    if (source.joins?.length) {
      source.joins.forEach(join => {
        sql += `\n${join.type} JOIN ${join.table}`;
        if (join.alias) sql += ` AS ${join.alias}`;
        sql += ` ON ${join.on.leftField} ${join.on.operator} ${join.on.rightField}`;
      });
    }

    // WHERE clause
    const whereClause = generateWhereClause(where);
    if (whereClause) {
      sql += `\nWHERE ${whereClause}`;
    }

    // GROUP BY clause
    if (groupBy?.length) {
      sql += `\nGROUP BY ${groupBy.map(g => g.field).join(', ')}`;

      // HAVING clause
      const havingClauses = groupBy.filter(g => g.having).map(g =>
        `${g.having!.aggregate} ${g.having!.operator} ${g.having!.value}`
      );
      if (havingClauses.length) {
        sql += `\nHAVING ${havingClauses.join(' AND ')}`;
      }
    }

    // ORDER BY clause
    if (orderBy?.length) {
      sql += `\nORDER BY ${orderBy.map(o =>
        `${o.field} ${o.direction}${o.nulls ? ` NULLS ${o.nulls}` : ''}`
      ).join(', ')}`;
    }

    // LIMIT clause
    if (limit) {
      sql += `\nLIMIT ${limit.count}`;
      if (limit.offset) sql += ` OFFSET ${limit.offset}`;
    }

    return sql;
  };

  const generateWhereClause = (group: FilterGroup): string => {
    const parts: string[] = [];

    // Process filters
    if (group.filters?.length) {
      parts.push(...group.filters.map(filter => {
        let value = filter.value;
        if (filter.dataType === 'string' && !['in', 'not_in'].includes(filter.operator)) {
          value = `'${value}'`;
        }

        switch (filter.operator) {
          case 'contains':
            return `${filter.field} LIKE '%${filter.value}%'`;
          case 'starts_with':
            return `${filter.field} LIKE '${filter.value}%'`;
          case 'ends_with':
            return `${filter.field} LIKE '%${filter.value}'`;
          case 'between':
            return `${filter.field} BETWEEN ${(filter.value as unknown[])[0]} AND ${(filter.value as unknown[])[1]}`;
          case 'in':
            return `${filter.field} IN (${(filter.value as unknown[]).join(', ')})`;
          case 'is_empty':
            return `(${filter.field} IS NULL OR ${filter.field} = '')`;
          case 'is_not_empty':
            return `(${filter.field} IS NOT NULL AND ${filter.field} != '')`;
          default:
            return `${filter.field} ${filter.operator} ${value}`;
        }
      }));
    }

    // Process nested groups
    if (group.groups?.length) {
      parts.push(...group.groups.map(g => `(${generateWhereClause(g)})`));
    }

    return parts.join(` ${group.type} `);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Create New View</h3>
          <p className="text-gray-600 mt-1">Build advanced queries with visual or SQL editor</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onQueryBuilderModeChange('visual')}
            className={`px-3 py-1 rounded ${
              queryBuilderMode === 'visual'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            <Layers className="w-4 h-4 inline mr-1" />
            Visual
          </button>
          <button
            onClick={() => onQueryBuilderModeChange('sql')}
            className={`px-3 py-1 rounded ${
              queryBuilderMode === 'sql'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            <Code className="w-4 h-4 inline mr-1" />
            SQL
          </button>
        </div>
      </div>

      {/* View creation form would go here - showing SQL preview for now */}
      <div className="bg-gray-900 text-gray-100 p-6 rounded-lg font-mono text-sm">
        <pre>{generateSQL(formData)}</pre>
      </div>

      {/* Action buttons */}
      <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onSubmit}
          disabled={!formData.name || !formData.title}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Save className="w-4 h-4" />
          Create View
        </button>
      </div>
    </div>
  );
};
