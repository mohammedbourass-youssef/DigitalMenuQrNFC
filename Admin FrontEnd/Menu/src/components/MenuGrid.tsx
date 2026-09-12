import { useLanguage } from '@/contexts/LanguageContext';
import { useCart } from '@/contexts/CartContext';
import { products, categories } from '@/data';
import type { Product } from '@/types';
import { ProductCard } from './ProductCard';
import { SearchX } from 'lucide-react';

export function MenuGrid({
  activeCategory,
  onProductClick,
}: {
  activeCategory: string;
  onProductClick: (product: Product) => void;
}) {
  const { tl, t } = useLanguage();

  let displayProducts: Product[];
  let sectionTitle: string;

  if (activeCategory === 'promos') {
    displayProducts = products.filter((p) => p.promo);
    sectionTitle = tl(categories[0].name);
  } else {
    displayProducts = products.filter((p) => p.categoryId === activeCategory);
    const cat = categories.find((c) => c.id === activeCategory);
    sectionTitle = cat ? tl(cat.name) : '';
  }

  if (displayProducts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <SearchX className="mb-3 h-12 w-12 text-gray-300" />
        <p className="text-base font-bold text-gray-500">{t('noResults')}</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-4">
      <h2 className="mb-4 text-lg font-extrabold text-gray-900">{sectionTitle}</h2>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {displayProducts.map((product) => (
          <ProductCard key={product.id} product={product} onCardClick={onProductClick} />
        ))}
      </div>
    </div>
  );
}
