import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createTable,
  deleteTable,
  generateQrCode,
  getQrCode,
  getTables,
  updateTable,
} from "@/services/tableService";
import type { CreateTablePayload, UpdateTablePayload } from "@/types";
import { PLAN_QUOTA_QUERY_KEY } from "@/hooks/usePlanQuota";

export const tablesQueryKey = ["admin-tables"] as const;

export function useTables() {
  return useQuery({
    queryKey: tablesQueryKey,
    queryFn: getTables,
    staleTime: 30_000,
    retry: 1,
  });
}

export function useCreateTable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTable,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: tablesQueryKey });
      void queryClient.invalidateQueries({ queryKey: PLAN_QUOTA_QUERY_KEY });
    },
  });
}

export function useUpdateTable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateTable,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: tablesQueryKey });
    },
  });
}

export function useDeleteTable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteTable,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: tablesQueryKey });
      void queryClient.invalidateQueries({ queryKey: PLAN_QUOTA_QUERY_KEY });
    },
  });
}

export function useGenerateQrCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: generateQrCode,
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: tablesQueryKey });
    },
  });
}
