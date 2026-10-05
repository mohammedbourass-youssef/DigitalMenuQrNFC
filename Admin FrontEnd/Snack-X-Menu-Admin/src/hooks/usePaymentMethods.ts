import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  addPaymentMethod,
  deletePaymentMethod,
  getEnabledPaymentMethods,
  getSystemPaymentMethods,
  getTenantPaymentMethods,
  reorderPaymentMethods,
  setPaymentMethodDefault,
  setPaymentMethodEnabled,
  updatePaymentMethod,
} from "@/services/paymentMethodService";
import type {
  AddPaymentMethodPayload,
  ReorderPaymentMethodsPayload,
  SetEnabledPayload,
  SystemPaymentMethod,
  TenantPaymentMethod,
  UpdatePaymentMethodPayload,
} from "@/types/paymentMethod";

export const PAYMENT_METHODS_QUERY_KEY = ["payment-methods"] as const;

/** Catalog for the add dialog. Refetched whenever the dialog opens. */
export function useSystemPaymentMethods(enabled = true) {
  return useQuery({
    queryKey: [...PAYMENT_METHODS_QUERY_KEY, "system"],
    queryFn: getSystemPaymentMethods,
    enabled,
    staleTime: 60_000,
    retry: 1,
  });
}

/** The tenant's methods. `sort` mirrors the backend's displayOrder ordering. */
export function usePaymentMethods(enabled = true) {
  return useQuery({
    queryKey: PAYMENT_METHODS_QUERY_KEY,
    queryFn: getTenantPaymentMethods,
    enabled,
    staleTime: 15_000,
    retry: 1,
  });
}

/** Enabled methods only - the shape a cashier / payment screen needs. */
export function useEnabledPaymentMethods(enabled = true) {
  return useQuery({
    queryKey: [...PAYMENT_METHODS_QUERY_KEY, "enabled"],
    queryFn: getEnabledPaymentMethods,
    enabled,
    staleTime: 15_000,
    retry: 1,
  });
}

/**
 * Writes a list back to the cache without a refetch. Used for the optimistic
 * switch/star/reorder so the row reacts instantly.
 */
function writeCache(queryClient: ReturnType<typeof useQueryClient>, methods: TenantPaymentMethod[]) {
  queryClient.setQueryData<TenantPaymentMethod[]>(PAYMENT_METHODS_QUERY_KEY, methods);
}

export function useAddPaymentMethod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AddPaymentMethodPayload) => addPaymentMethod(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PAYMENT_METHODS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: [...PAYMENT_METHODS_QUERY_KEY, "system"] });
    },
  });
}

export function useUpdatePaymentMethod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: number; payload: UpdatePaymentMethodPayload }) =>
      updatePaymentMethod(args.id, args.payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PAYMENT_METHODS_QUERY_KEY });
    },
  });
}

/**
 * Enable/disable. Optimistic with rollback: the switch flips immediately and
 * snaps back if the backend refuses (e.g. LAST_ENABLED).
 */
export function useSetPaymentMethodEnabled() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: number; payload: SetEnabledPayload }) =>
      setPaymentMethodEnabled(args.id, args.payload),
    onMutate: async ({ id, payload }) => {
      await queryClient.cancelQueries({ queryKey: PAYMENT_METHODS_QUERY_KEY });
      const previous = queryClient.getQueryData<TenantPaymentMethod[]>(PAYMENT_METHODS_QUERY_KEY);
      if (previous) {
        writeCache(
          queryClient,
          previous.map((method) => {
            if (method.id !== id) return method;
            // A disabled method cannot stay the default; the backend promotes
            // another enabled row, which lands with the invalidate below.
            if (!payload.isEnabled && method.isDefault) {
              return { ...method, isEnabled: false, isDefault: false };
            }
            return { ...method, isEnabled: payload.isEnabled };
          })
        );
      }
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) writeCache(queryClient, context.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: PAYMENT_METHODS_QUERY_KEY });
    },
  });
}

/** Set default. Optimistic: only one row can carry the badge. */
export function useSetPaymentMethodDefault() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => setPaymentMethodDefault(id),
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: PAYMENT_METHODS_QUERY_KEY });
      const previous = queryClient.getQueryData<TenantPaymentMethod[]>(PAYMENT_METHODS_QUERY_KEY);
      if (previous) {
        writeCache(
          queryClient,
          previous.map((method) =>
            method.id === id
              ? { ...method, isDefault: true, isEnabled: true }
              : method.isDefault
                ? { ...method, isDefault: false }
                : method
          )
        );
      }
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) writeCache(queryClient, context.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: PAYMENT_METHODS_QUERY_KEY });
    },
  });
}

/** Reorder. Optimistic with rollback on INVALID_ORDER. */
export function useReorderPaymentMethods() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ReorderPaymentMethodsPayload) => reorderPaymentMethods(payload),
    onMutate: async (payload: ReorderPaymentMethodsPayload) => {
      await queryClient.cancelQueries({ queryKey: PAYMENT_METHODS_QUERY_KEY });
      const previous = queryClient.getQueryData<TenantPaymentMethod[]>(PAYMENT_METHODS_QUERY_KEY);
      if (previous) {
        const byId = new Map(previous.map((method) => [method.id, method]));
        const reordered = payload.orderedIds
          .map((id, index) => {
            const method = byId.get(id);
            return method ? { ...method, displayOrder: index + 1 } : null;
          })
          .filter((method): method is TenantPaymentMethod => method !== null);
        // Keep anything the caller did not send (defensive: backend rejects a
        // partial list with INVALID_ORDER, so we never send one).
        if (reordered.length === previous.length) writeCache(queryClient, reordered);
      }
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) writeCache(queryClient, context.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: PAYMENT_METHODS_QUERY_KEY });
    },
  });
}

export function useDeletePaymentMethod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deletePaymentMethod(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PAYMENT_METHODS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: [...PAYMENT_METHODS_QUERY_KEY, "system"] });
    },
  });
}

/** Shape helper so the page can render without narrowing by hand. */
export type { SystemPaymentMethod, TenantPaymentMethod };