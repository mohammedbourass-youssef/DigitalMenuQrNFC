import axiosInstance from "@/lib/axios";
import type {
  Category,
  AdminCategoryResponse,
  CategoryAdminInfo,
  CreateCategoryDTO,
  CreateCategoryResponse,
  UpdateCategoryLanguagesRequest,
  UpdateCategoryLanguagesResponse,
} from "@/types";

export const getAdminCategories = async (
  lang: string,
  pageNumber: number,
  pageCount: number
): Promise<AdminCategoryResponse> => {
  const { data } = await axiosInstance.get<AdminCategoryResponse>(
    "Cateogries/categories-Admin",
    { params: { lang, pageNumber, pageCount } }
  );
  return data;
};

export const getCategories = async (): Promise<Category[]> => {
  const { data } = await axiosInstance.get<AdminCategoryResponse>("Cateogries/categories-Admin");
  return data.data.map((item) => ({
    id: item.id,
    name: item.name ?? "",
    description: item.desc ?? "",
    color: item.color,
    imageUrl: item.imageUrl ?? undefined,
  }));
};

export const createCategory = async (
  data: CreateCategoryDTO,
  signal?: AbortSignal
): Promise<CreateCategoryResponse> => {
  const formData = new FormData();
  formData.append("Name", data.name);
  if (data.description) formData.append("Description", data.description);
  if (data.color) formData.append("Color", data.color);
  if (data.displayOrder != null) formData.append("SortOrder", String(data.displayOrder));
  if (data.image) formData.append("Image", data.image);

  const response = await axiosInstance.post<CreateCategoryResponse>(
    "Cateogries",
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
      signal,
    }
  );
  return response.data;
};

export const updateCategoryLanguages = async (
  data: UpdateCategoryLanguagesRequest,
  signal?: AbortSignal
): Promise<UpdateCategoryLanguagesResponse> => {
  const response = await axiosInstance.put<UpdateCategoryLanguagesResponse>(
    "Cateogries/category-languages",
    {
      CategoryId: data.categoryId,
      Translations: data.translations,
    },
    { signal }
  );
  return response.data;
};

export const updateCategoryDisplay = async (
  categoryId: string,
  color: string,
  displayOrder: number
): Promise<{ message: string }> => {
  const response = await axiosInstance.patch<{ message: string }>(
    "Cateogries/display",
    {
      CategoryId: categoryId,
      Color: color,
      DisplayOrder: displayOrder,
    }
  );
  return response.data;
};

export const getCategoryInfoAdmin = async (
  categoryId: string
): Promise<CategoryAdminInfo> => {
  const response = await axiosInstance.get<CategoryAdminInfo>(
    `Cateogries/${categoryId}/info-Admin`
  );
  return response.data;
};

export const deactivateCategory = async (
  categoryId: string
): Promise<{ message: string }> => {
  const response = await axiosInstance.patch<{ message: string }>(
    `Cateogries/${categoryId}/disactive`
  );
  return response.data;
};

export const activateCategory = async (
  categoryId: string
): Promise<{ message: string }> => {
  const response = await axiosInstance.patch<{ message: string }>(
    `Cateogries/${categoryId}/active`
  );
  return response.data;
};
