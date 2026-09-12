import type { Category } from "@/types";

const categories: Category[] = [
  { id: "c1", name: "Burgers", description: "Signature burgers and sandwiches.", color: "#f97316" },
  { id: "c2", name: "Mains", description: "Hearty mains and combos.", color: "#14b8a6" },
  { id: "c3", name: "Drinks", description: "Refreshing drinks and shakes.", color: "#a78bfa" },
  { id: "c4", name: "Desserts", description: "Sweet treats and desserts.", color: "#facc15" },
];

export const getCategories = (): Promise<Category[]> => Promise.resolve(categories);
