/**
 * Custom hook for ACF (Advanced Custom Fields) operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { acfGroupApi, acfValueApi, acfUtilsApi } from '../services/acf.api';
import {
  FieldGroup,
  CreateFieldGroupDto,
  UpdateFieldGroupDto,
  SaveFieldValuesDto,
  ExportFieldGroupsDto,
  ImportFieldGroupsDto
} from '../types/acf.types';

// Query keys
const ACF_KEYS = {
  all: ['acf'] as const,
  groups: () => [...ACF_KEYS.all, 'groups'] as const,
  group: (id: string) => [...ACF_KEYS.groups(), id] as const,
  values: (entityType: string, entityId: string) =>
    [...ACF_KEYS.all, 'values', entityType, entityId] as const,
  value: (entityType: string, entityId: string, fieldName: string) =>
    [...ACF_KEYS.values(entityType, entityId), fieldName] as const,
  location: (param: string, value: string) =>
    [...ACF_KEYS.all, 'location', param, value] as const,
};

/**
 * Hook for fetching all field groups
 */
export function useACFGroups() {
  return useQuery({
    queryKey: ACF_KEYS.groups(),
    queryFn: () => acfGroupApi.getAllGroups(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    select: (data) => data.data || [],
  });
}

/**
 * Hook for fetching a single field group
 */
export function useACFGroup(id: string) {
  return useQuery({
    queryKey: ACF_KEYS.group(id),
    queryFn: () => acfGroupApi.getGroup(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    select: (data) => data.data,
  });
}

/**
 * Hook for creating a field group
 */
export function useCreateACFGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateFieldGroupDto) => acfGroupApi.createGroup(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ACF_KEYS.groups() });
      toast.success('Field group created successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create field group');
    },
  });
}

/**
 * Hook for updating a field group
 */
export function useUpdateACFGroup(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateFieldGroupDto) => acfGroupApi.updateGroup(id, data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ACF_KEYS.group(id) });
      queryClient.invalidateQueries({ queryKey: ACF_KEYS.groups() });
      toast.success('Field group updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update field group');
    },
  });
}

/**
 * Hook for deleting a field group
 */
export function useDeleteACFGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => acfGroupApi.deleteGroup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ACF_KEYS.groups() });
      toast.success('Field group deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete field group');
    },
  });
}

/**
 * Hook for fetching field values
 */
export function useACFValues(entityType: string, entityId: string) {
  return useQuery({
    queryKey: ACF_KEYS.values(entityType, entityId),
    queryFn: () => acfValueApi.getValues(entityType, entityId),
    enabled: !!entityType && !!entityId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    select: (data) => data.data || {},
  });
}

/**
 * Hook for fetching a single field value
 */
export function useACFValue(
  entityType: string,
  entityId: string,
  fieldName: string
) {
  return useQuery({
    queryKey: ACF_KEYS.value(entityType, entityId, fieldName),
    queryFn: () => acfValueApi.getValue(entityType, entityId, fieldName),
    enabled: !!entityType && !!entityId && !!fieldName,
    staleTime: 2 * 60 * 1000,
    select: (data) => data.data,
  });
}

/**
 * Hook for saving field values
 */
export function useSaveACFValues(entityType: string, entityId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: SaveFieldValuesDto) =>
      acfValueApi.saveValues(entityType, entityId, values),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ACF_KEYS.values(entityType, entityId),
      });
      toast.success('Field values saved successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to save field values');
    },
  });
}

/**
 * Hook for updating a single field value
 */
export function useUpdateACFValue(
  entityType: string,
  entityId: string,
  fieldName: string
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (value: any) =>
      acfValueApi.updateValue(entityType, entityId, fieldName, value),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ACF_KEYS.value(entityType, entityId, fieldName),
      });
      queryClient.invalidateQueries({
        queryKey: ACF_KEYS.values(entityType, entityId),
      });
      toast.success('Field value updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update field value');
    },
  });
}

/**
 * Hook for exporting field groups
 */
export function useExportACFGroups() {
  return useMutation({
    mutationFn: (data?: ExportFieldGroupsDto) => acfGroupApi.exportGroups(data),
    onSuccess: (response) => {
      // Handle download or display export data
      const blob = new Blob([JSON.stringify(response.data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `acf-export-${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Field groups exported successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to export field groups');
    },
  });
}

/**
 * Hook for importing field groups
 */
export function useImportACFGroups() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ImportFieldGroupsDto) => acfGroupApi.importGroups(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ACF_KEYS.groups() });
      toast.success('Field groups imported successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to import field groups');
    },
  });
}

/**
 * Hook for fetching fields by location
 */
export function useACFFieldsByLocation(param: string, value: string) {
  return useQuery({
    queryKey: ACF_KEYS.location(param, value),
    queryFn: () => acfUtilsApi.getFieldsByLocation(param, value),
    enabled: !!param && !!value,
    staleTime: 5 * 60 * 1000,
    select: (data) => data.data || [],
  });
}

/**
 * Hook for validating field value
 */
export function useValidateACFValue() {
  return useMutation({
    mutationFn: ({ fieldId, value }: { fieldId: string; value: any }) =>
      acfUtilsApi.validateValue(fieldId, value),
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Validation failed');
    },
  });
}

/**
 * Hook for getting field schema
 */
export function useACFFieldSchema(fieldType: string) {
  return useQuery({
    queryKey: [...ACF_KEYS.all, 'schema', fieldType],
    queryFn: () => acfUtilsApi.getFieldSchema(fieldType),
    enabled: !!fieldType,
    staleTime: 10 * 60 * 1000, // 10 minutes - schemas don't change often
    select: (data) => data.data,
  });
}