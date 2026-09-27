import type { PublicCategory } from '../types/category';
import type { LanguageCode } from '../lib/constants';
import type { LocalizedString } from '../types';

/**
 * The one frontend-owned category: an "All" tab that shows the entire menu.
 *
 * The API list describes real `categoryId` buckets, so none of its entries mean
 * "everything" — selecting only ever narrows the grid. This tab is prepended to
 * the API list and is the default selection on load.
 *
 * Its id is deliberately not a plausible product `categoryId`, so it can never
 * collide with a real bucket and be mistaken for one by the filter.
 */
export const ALL_CATEGORY_ID = 'all';

export const ALL_CATEGORY: Omit<PublicCategory, 'name' | 'desc'> & {
  name: LocalizedString;
  desc: LocalizedString;
} = {  id: ALL_CATEGORY_ID,
  name: {
    en: 'All',
    ar: 'الكل',
    fr: 'Tous',
    es: 'Todos',
    it: 'Tutti',
    ja: 'すべて',
    zh: '全部',
    ko: '전체',
    de: 'Alle',
  },
  desc: {
    en: 'The whole menu',
    ar: 'القائمة كاملة',
    fr: 'Toute la carte',
    es: 'Todo el menú',
    it: 'Tutto il menù',
    ja: 'メニュー全体',
    zh: '全部菜单',
    ko: '전체 메뉴',
    de: 'Die gesamte Karte',
  },
  // Distinct from the warm accents the API categories use, so this tab reads as
  // a neutral "browse everything" control rather than another dish grouping.
  color: '#4F46E5',
  image: '',
  icon: 'LayoutGrid',
};

/** Falls back through French to English, the guaranteed keys of `LocalizedString`. */
function localize(value: LocalizedString, lang: LanguageCode): string {
  return value[lang] ?? value.fr ?? value.en;
}

/** The "All" tab, localised, in the same shape the API returns. */
export function buildAllCategory(lang: LanguageCode): PublicCategory {
  return {
    ...ALL_CATEGORY,
    name: localize(ALL_CATEGORY.name, lang),
    desc: localize(ALL_CATEGORY.desc, lang),
  };
}
