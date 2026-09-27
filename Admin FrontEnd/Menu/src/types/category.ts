/**
 * A category as returned by the public categories endpoint.
 *
 * The backend resolves both the name and the image server-side: `name` is
 * already translated for the requested `lang`, and `image` is a fully
 * resolved, ready-to-use URL. Neither needs further transformation here.
 */
export interface PublicCategory {
  /** Guid, as a string. Matches `Product.categoryId`. */
  id: string;
  /** Already localised server-side — not a LocalizedString. */
  name: string;
  desc: string;
  /** Hex string, e.g. `#FF6B35`. */
  color: string;
  /** Fully resolved URL, or an empty string when the category has no image. */
  image: string;
  /** lucide-react icon name, used when there is no image. Frontend-owned only. */
  icon?: string;
}

/** The endpoint returns 200 with this envelope, or 204 with no body at all. */
export interface CategoriesResponse {
  data: PublicCategory[];
}

export type CategoriesStatus = 'loading' | 'ready' | 'error';

/** What consumers of the category rail see, for one language. */
export interface CategoriesSnapshot {
  status: CategoriesStatus;
  categories: PublicCategory[];
  /** Retained so the session guard can inspect it. `null` unless status is 'error'. */
  error: unknown;
}
