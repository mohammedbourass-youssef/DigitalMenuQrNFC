import axiosInstance from "@/lib/axios";
import type { CreateTablePayload, TableItem, UpdateTablePayload } from "@/types";

export const getTables = async (): Promise<TableItem[]> => {
  const { data } = await axiosInstance.get<TableItem[]>("tables");
  return data;
};

export const getTableById = async (id: string): Promise<TableItem> => {
  const { data } = await axiosInstance.get<TableItem>(`tables/${id}`);
  return data;
};

export const createTable = async (payload: CreateTablePayload): Promise<TableItem> => {
  const { data } = await axiosInstance.post<TableItem>("tables", payload);
  return data;
};

export const updateTable = async (payload: UpdateTablePayload): Promise<{ message: string }> => {
  const { data } = await axiosInstance.put<{ message: string }>("tables", payload);
  return data;
};

export const deleteTable = async (id: string): Promise<{ message: string }> => {
  const { data } = await axiosInstance.delete<{ message: string }>(`tables/${id}`);
  return data;
};

export interface QrCodeResponse {
  qrCodeUrl: string;
  qrData: string;
}

export const getQrCode = async (id: string): Promise<QrCodeResponse> => {
  const { data } = await axiosInstance.get<QrCodeResponse>(`tables/${id}/qr`);
  return data;
};

export const generateQrCode = async (id: string): Promise<QrCodeResponse> => {
  const { data } = await axiosInstance.post<QrCodeResponse>(`tables/${id}/qr/generate`);
  return data;
};