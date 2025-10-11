/**
 * Dependency Visualizer Component
 * Visualizes field dependencies and conditional logic relationships
 */

import React, { useMemo } from 'react';
import { ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';
import type { CustomField } from '../types/acf.types';
import { getFieldDependencies, hasCircularDependency } from '../utils/conditionalLogic';

interface DependencyVisualizerProps {
  fields: CustomField[];
  highlightField?: string;
}

interface FieldNode {
  field: CustomField;
  dependencies: string[];
  dependents: string[];
  hasCircular: boolean;
}

export const DependencyVisualizer: React.FC<DependencyVisualizerProps> = ({
  fields,
  highlightField,
}) => {
  // Build dependency graph
  const { nodes, hasAnyCircular } = useMemo(() => {
    const nodeMap = new Map<string, FieldNode>();
    const logicMap = new Map(
      fields.map((f) => [f.name, f.conditionalLogic])
    );

    // Initialize nodes
    fields.forEach((field) => {
      const dependencies = getFieldDependencies(field.conditionalLogic);
      const isCircular = hasCircularDependency(
        field.name,
        field.conditionalLogic,
        logicMap
      );

      nodeMap.set(field.name, {
        field,
        dependencies,
        dependents: [],
        hasCircular: isCircular,
      });
    });

    // Build dependents
    nodeMap.forEach((node, fieldName) => {
      node.dependencies.forEach((depName) => {
        const depNode = nodeMap.get(depName);
        if (depNode) {
          depNode.dependents.push(fieldName);
        }
      });
    });

    const hasCircular = Array.from(nodeMap.values()).some((n) => n.hasCircular);

    return {
      nodes: nodeMap,
      hasAnyCircular: hasCircular,
    };
  }, [fields]);

  // Get fields with conditional logic
  const fieldsWithLogic = useMemo(() => {
    return Array.from(nodes.values()).filter(
      (node) =>
        node.field.conditionalLogic &&
        node.field.conditionalLogic.enabled &&
        node.dependencies.length > 0
    );
  }, [nodes]);

  if (fieldsWithLogic.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No conditional logic configured yet.</p>
        <p className="text-sm mt-1">
          Add conditional logic to fields to see dependencies here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status Banner */}
      {hasAnyCircular ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-800">
            <p className="font-medium">Circular Dependencies Detected</p>
            <p>Some fields have circular dependencies. Please review and fix.</p>
          </div>
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-green-800">
            <p className="font-medium">No Circular Dependencies</p>
            <p>All conditional logic is properly configured.</p>
          </div>
        </div>
      )}

      {/* Dependency List */}
      <div className="space-y-2">
        {fieldsWithLogic.map((node) => {
          const isHighlighted = highlightField === node.field.name;
          const logic = node.field.conditionalLogic!;

          return (
            <div
              key={node.field.name}
              className={`
                border rounded-lg p-3 transition-colors
                ${
                  isHighlighted
                    ? 'border-blue-500 bg-blue-50'
                    : node.hasCircular
                    ? 'border-red-300 bg-red-50'
                    : 'border-gray-200 bg-white'
                }
              `}
            >
              {/* Field Name */}
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-medium text-gray-900">
                  {node.field.label || node.field.name}
                </h4>
                {node.hasCircular && (
                  <span className="px-2 py-0.5 bg-red-200 text-red-800 text-xs font-medium rounded">
                    Circular
                  </span>
                )}
              </div>

              {/* Dependencies */}
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-600">Depends on:</span>
                <div className="flex items-center gap-1 flex-wrap">
                  {node.dependencies.map((depName, index) => {
                    const depNode = nodes.get(depName);
                    const depLabel = depNode?.field.label || depName;

                    return (
                      <React.Fragment key={depName}>
                        {index > 0 && (
                          <span className="text-gray-400 text-xs font-medium">
                            {logic.logic.toUpperCase()}
                          </span>
                        )}
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded font-medium">
                          {depLabel}
                        </span>
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

              {/* Dependents */}
              {node.dependents.length > 0 && (
                <div className="flex items-center gap-2 text-sm mt-2 pt-2 border-t border-gray-200">
                  <span className="text-gray-600">Controls:</span>
                  <div className="flex items-center gap-1 flex-wrap">
                    {node.dependents.map((depName) => {
                      const depNode = nodes.get(depName);
                      const depLabel = depNode?.field.label || depName;

                      return (
                        <span
                          key={depName}
                          className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded font-medium"
                        >
                          {depLabel}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DependencyVisualizer;
