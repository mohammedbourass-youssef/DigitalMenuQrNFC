import type { MenuItem } from "@/types";

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
