import axiosInstance from "@/lib/axios";
import type { MenuItem } from "@/types";
import type {
  AdminMenuItem,
  AdminMenusParams,
  PagedResult,
} from "@/types/menuItem";

const menuItems: MenuItem[] = [
  {
    id: "m1",
    name: "Big Snack Burger",
    description: "Smash patties, American cheese, house sauce.",
    price: 18,
    categoryId: "c1",
    available: true,
    image: "https://images.unsplash.com/...",
  },
  {
    id: "m2",
    name: "Green Room Burger",
    description: "Herby greens, avocado, pickled onion.",
    price: 16.25,
    categoryId: "c1",
    available: true,
  },
  {
    id: "m3",
    name: "Hot Honey Chicken",
    description: "Crispy chicken, hot honey, cool slaw.",
    price: 14.75,
    categoryId: "c2",
    available: true,
  },
  {
    id: "m4",
    name: "Salted Caramel Shake",
    description: "Vanilla soft serve, caramel, flaky salt.",
    price: 7,
    categoryId: "c3",
    available: true,
  },
  {
    id: "m5",
    name: "House Soda",
    description: "Rotating seasonal soda, made in-house.",
    price: 5,
    categoryId: "c3",
    available: false,
  },
  {
    id: "m6",
    name: "Soft Serve Cake",
    description: "Warm butter cake, soft serve, cherry.",
    price: 6,
    categoryId: "c4",
    available: true,
  },
];

export const getMenuItems = (): Promise<MenuItem[]> => Promise.resolve(menuItems);

export const getAdminMenus = async (
  params: AdminMenusParams
): Promise<PagedResult<AdminMenuItem>> => {
  const query = new URLSearchParams();

  query.set("currencyCode", params.currencyCode);
  query.set("language", params.language);

  if (params.page != null) query.set("page", String(params.page));
  if (params.pageSize != null) query.set("pageSize", String(params.pageSize));

  const { data } = await axiosInstance.get<PagedResult<AdminMenuItem>>(
    "MenuItems/Admin-menus",
    { params: query }
  );

  return data;
};

export const deactivateMenuItem = async (id: string): Promise<{ message: string }> => {
  const { data } = await axiosInstance.patch<{ message: string }>(`MenuItems/${id}/disactive`);
  return data;
};

export const activateMenuItem = async (id: string): Promise<{ message: string }> => {
  const { data } = await axiosInstance.patch<{ message: string }>(`MenuItems/${id}/active`);
  return data;
};

export const getMenuItemInfoAdmin = async (id: string): Promise<AdminMenuItem> => {
  const { data } = await axiosInstance.get<AdminMenuItem>(`MenuItems/${id}/info-Admin`);
  return data;
};

export const moveMenuItemToCategory = async (
  id: string,
  categoryId: string
): Promise<{ message: string }> => {
  const { data } = await axiosInstance.put<{ message: string }>(`MenuItems/${id}/move`, {
    categoryId,
  });
  return data;
};
