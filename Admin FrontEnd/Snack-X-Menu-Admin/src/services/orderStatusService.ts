import axiosInstance from "@/lib/axios";
import type {
  CreateOrderStatusPayload,
  OrderStatusItem,
  OrderStatusTranslationEntry,
  OrderStatusTranslations,
  UpdateOrderStatusPayload,
} from "@/types";

const JSON_HEADERS = { "Content-Type": "application/json" } as const;

export const getOrderStatuses = async (lang: string): Promise<OrderStatusItem[]> => {
  const { data } = await axiosInstance.get<OrderStatusItem[]>("orders/Statuses", {
    params: { lang },
  });
  return data;
};

export const createOrderStatus = async (payload: CreateOrderStatusPayload): Promise<void> => {
  await axiosInstance.post("orders/NewStatus", payload);
};

export const createStatusFast = async (name: string): Promise<void> => {
  await axiosInstance.post("orders/Fast/NewStatus", JSON.stringify(name), { headers: JSON_HEADERS });
};

export const updateOrderStatus = async (
  id: number,
  payload: UpdateOrderStatusPayload
): Promise<void> => {
  await axiosInstance.put(`orders/Status/${id}`, payload, { headers: JSON_HEADERS });
};

export const deleteOrderStatus = async (id: number): Promise<void> => {
  await axiosInstance.delete(`orders/Status/${id}`);
};

export const getOrderStatusTranslations = async (
  id: number
): Promise<OrderStatusTranslations> => {
  const { data } = await axiosInstance.get<OrderStatusTranslations>(
    `orders/Status/${id}/Translations`
  );
  return data;
};

export const updateOrderStatusTranslations = async (
  id: number,
  payload: { translations: OrderStatusTranslationEntry[] }
): Promise<void> => {
  await axiosInstance.put(`orders/Status/${id}/Translations`, payload, {
    headers: JSON_HEADERS,
  });
};