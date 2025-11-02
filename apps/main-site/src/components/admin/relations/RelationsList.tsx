import { FC } from 'react';
import {
  Plus,
  Edit3,
  Trash2,
  ArrowRight,
  ArrowLeftRight,
  Link
} from 'lucide-react';
import type { Relation, AvailableCPT } from '../../../types/relations';

interface RelationsListProps {
  relations: Relation[];
  availableCPTs: AvailableCPT[];
  onCreateClick: () => void;
  onEdit: (relation: Relation) => void;
  onDelete: (id: string) => void;
}

export const RelationsList: FC<RelationsListProps> = ({
  relations,
  availableCPTs,
  onCreateClick,
  onEdit,
  onDelete
}) => {
  const getRelationTypeIcon = (type: Relation['type']) => {
    switch (type) {
      case 'one-to-one': return <ArrowRight className="w-5 h-5" />;
      case 'one-to-many': return <ArrowRight className="w-5 h-5" />;
      case 'many-to-many': return <ArrowLeftRight className="w-5 h-5" />;
      default: return <Link className="w-5 h-5" />;
    }
  };

  const getRelationTypeLabel = (type: Relation['type']) => {
    switch (type) {
      case 'one-to-one': return '1:1 (일대일)';
      case 'one-to-many': return '1:N (일대다)';
      case 'many-to-many': return 'N:N (다대다)';
      default: return type;
    }
  };

  const getCPTIcon = (slug: string) => {
    const cpt = availableCPTs.find(c => c.slug === slug);
    return cpt?.icon || '📄';
  };

  const getCPTName = (slug: string) => {
    const cpt = availableCPTs.find(c => c.slug === slug);
    return cpt?.name || slug;
  };

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900">등록된 관계</h3>
          <p className="text-sm text-gray-500">총 {relations.length}개의 관계가 정의되어 있습니다.</p>
        </div>
        <button
          onClick={onCreateClick}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          새 관계 생성
        </button>
      </div>

      {relations.length === 0 ? (
        <div className="text-center py-12">
          <Link className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            아직 생성된 관계가 없습니다
          </h3>
          <p className="text-gray-600 mb-4">
            첫 번째 Post Type 관계를 생성해보세요
          </p>
          <button
            onClick={onCreateClick}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            새 관계 생성
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {relations.map(relation => (
            <div key={relation.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-gray-900 text-lg">{relation.label}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      relation.type === 'one-to-one' ? 'bg-green-100 text-green-800' :
                      relation.type === 'one-to-many' ? 'bg-blue-100 text-blue-800' :
                      'bg-purple-100 text-purple-800'
                    }`}>
                      {getRelationTypeLabel(relation.type)}
                    </span>
                    {relation.bidirectional && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                        양방향
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mb-1">/{relation.name}</p>
                  {relation.description && (
                    <p className="text-gray-600 text-sm">{relation.description}</p>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => onEdit(relation)}
                    className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                    title="편집"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(relation.id)}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    title="삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Relation Visualization */}
              <div className="bg-gray-50 rounded-lg p-6 mb-4">
                <div className="flex items-center justify-between">
                  {/* From */}
                  <div className="flex-1 text-center">
                    <div className="inline-flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-200">
                      <span className="text-2xl">{getCPTIcon(relation.from.postType)}</span>
                      <div className="text-left">
                        <div className="font-medium text-gray-900">{getCPTName(relation.from.postType)}</div>
                        <div className="text-sm text-gray-500">{relation.from.label}</div>
                        <div className="text-xs text-gray-400">필드: {relation.from.fieldName}</div>
                      </div>
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="flex-shrink-0 mx-6">
                    <div className="flex items-center gap-2 text-gray-400">
                      {getRelationTypeIcon(relation.type)}
                      <span className="text-xs font-medium">
                        {relation.type === 'one-to-one' ? '1:1' :
                         relation.type === 'one-to-many' ? '1:N' : 'N:N'}
                      </span>
                    </div>
                  </div>

                  {/* To */}
                  <div className="flex-1 text-center">
                    <div className="inline-flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-200">
                      <span className="text-2xl">{getCPTIcon(relation.to.postType)}</span>
                      <div className="text-left">
                        <div className="font-medium text-gray-900">{getCPTName(relation.to.postType)}</div>
                        <div className="text-sm text-gray-500">{relation.to.label}</div>
                        <div className="text-xs text-gray-400">필드: {relation.to.fieldName}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Settings */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">정렬 가능:</span>
                    <span className={relation.settings.sortable ? 'text-green-600' : 'text-gray-400'}>
                      {relation.settings.sortable ? '예' : '아니오'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">중복 허용:</span>
                    <span className={relation.settings.duplicates ? 'text-green-600' : 'text-gray-400'}>
                      {relation.settings.duplicates ? '예' : '아니오'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">삭제 동작:</span>
                    <span className="font-medium">
                      {relation.settings.deleteAction === 'cascade' ? '연쇄 삭제' :
                       relation.settings.deleteAction === 'restrict' ? '삭제 제한' : 'NULL 설정'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-gray-500">상태:</span>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    relation.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {relation.active ? '활성' : '비활성'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
