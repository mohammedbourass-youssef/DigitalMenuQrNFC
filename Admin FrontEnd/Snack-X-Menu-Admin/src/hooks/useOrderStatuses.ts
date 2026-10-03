import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createOrderStatus,
  createStatusFast,
  deleteOrderStatus,
  getOrderStatuses,
  getOrderStatusTranslations,
  updateOrderStatus,
  updateOrderStatusTranslations,
} from "@/services/orderStatusService";
import type {
  CreateOrderStatusPayload,
  OrderStatusTranslationEntry,
  UpdateOrderStatusPayload,
} from "@/types";

export function orderStatusesQueryKey(lang: string) {
  return ["admin-order-statuses", lang] as const;
}

export function useOrderStatuses(lang: string) {
  return useQuery({
    queryKey: orderStatusesQueryKey(lang),
    queryFn: () => getOrderStatuses(lang),
    staleTime: 30_000,
    retry: 1,
  });
}

export function useCreateOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateOrderStatusPayload) => createOrderStatus(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-order-statuses"] });
    },
  });
}

export function useCreateStatusFast() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => createStatusFast(name),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-order-statuses"] });
    },
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: number; payload: UpdateOrderStatusPayload }) =>
      updateOrderStatus(args.id, args.payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-order-statuses"] });
    },
  });
}

export function useDeleteOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteOrderStatus(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-order-statuses"] });
    },
  });
}

export function useOrderStatusTranslations(id: number | null) {
  return useQuery({
    queryKey: ["admin-order-status-translations", id],
    queryFn: () => getOrderStatusTranslations(id as number),
    enabled: id !== null,
    staleTime: 30_000,
    retry: 1,
  });
}

export function useUpdateOrderStatusTranslations() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: number; translations: OrderStatusTranslationEntry[] }) =>
      updateOrderStatusTranslations(args.id, { translations: args.translations }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-order-statuses"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-order-status-translations"] });
    },
  });
}