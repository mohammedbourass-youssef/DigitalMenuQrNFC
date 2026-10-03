import type { Restaurant, Category, Product } from './types';

export const restaurant: Restaurant = {
  id: 'snack-x',
  name: {
    ar: 'سناكس إكس',
    fr: 'Snack X',
    en: 'Snack X',
  },
  logo: '',
  accentColor: '#E85D04',
  tagline: {
    ar: 'ألذ الوجبات في المدينة',
    fr: 'Les meilleurs snacks de la ville',
    en: 'The best bites in town',
  },
};

export const categories: Category[] = [
  {
    id: 'promos',
    name: { ar: 'العروض', fr: 'Promotions', en: 'Promotions' },
    icon: 'Flame',
  },
  {
    id: 'burgers',
    name: { ar: 'برغر', fr: 'Burgers', en: 'Burgers' },
    icon: 'Beef',
  },
  {
    id: 'sandwiches',
    name: { ar: 'سندويتش', fr: 'Sandwichs', en: 'Sandwiches' },
    icon: 'Sandwich',
  },
  {
    id: 'starters',
    name: { ar: 'المقبلات', fr: 'Entrées', en: 'Starters' },
    icon: 'Flame',
  },
  {
    id: 'drinks',
    name: { ar: 'مشروبات', fr: 'Boissons', en: 'Drinks' },
    icon: 'CupSoda',
  },
  {
    id: 'desserts',
    name: { ar: 'حلويات', fr: 'Desserts', en: 'Desserts' },
    icon: 'Cake',
  },
];

/**
 * Mock products. `gallery` is optional in the literals here — each entry has a
 * single `image` — and is filled in below, mirroring how the real mapper derives
 * a cover-first, de-duplicated gallery from the API payload.
 */
interface MockProduct extends Omit<Product, 'gallery'> {
  /** Extra gallery images beyond the cover; the cover is added below. */
  gallery?: string[];
}

export const products: MockProduct[] = [
  // === BURGERS ===
  {
    id: 'b1',
    name: {
      ar: 'برغر إكس الكلاسيكي',
      fr: 'Classic Burger X',
      en: 'Classic Burger X',
    },
    description: {
      ar: 'لحم بقري طازج 150غ، جبن شيدر، خس، طماطم، صلصة خاصة',
      fr: 'Boeuf frais 150g, cheddar, salade, tomate, sauce maison',
      en: 'Fresh beef 150g, cheddar, lettuce, tomato, house sauce',
    },
    price: 85,
    image: 'https://images.pexels.com/photos/8305726/pexels-photo-8305726.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    categoryId: 'burgers',
  },
  {
    id: 'b2',
    name: {
      ar: 'دبل تشيز برغر',
      fr: 'Double Cheese Burger',
      en: 'Double Cheese Burger',
    },
    description: {
      ar: 'قطعتان من اللحم، جبن مزدوج، بصل مكرمل، صلصة باربكيو',
      fr: 'Deux steaks, double cheddar, oignons caramélisés, sauce BBQ',
      en: 'Two patties, double cheddar, caramelized onions, BBQ sauce',
    },
    price: 110,
    image: 'https://images.pexels.com/photos/4080534/pexels-photo-4080534.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    categoryId: 'burgers',
  },
  {
    id: 'b3',
    name: {
      ar: 'برغر البيكون الحار',
      fr: 'Bacon Spicy Burger',
      en: 'Bacon Spicy Burger',
    },
    description: {
      ar: 'لحم بقري، بيكون مقرمش، هالابينو، جبن بيبر جاك',
      fr: 'Boeuf, bacon croustillant, jalapeño, pepper jack',
      en: 'Beef, crispy bacon, jalapeño, pepper jack cheese',
    },
    price: 120,
    image: 'https://images.pexels.com/photos/38895877/pexels-photo-38895877.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    categoryId: 'burgers',
    promo: {
      discountPercent: 20,
      oldPrice: 150,
    },
  },
  {
    id: 'b4',
    name: {
      ar: 'برغر الدجاج المقرمش',
      fr: 'Crispy Chicken Burger',
      en: 'Crispy Chicken Burger',
    },
    description: {
      ar: 'دجاج مقرمش، مايونيز حار، مخلل، خس طازج',
      fr: 'Poulet croustillant, mayo épicée, cornichons, salade fraîche',
      en: 'Crispy chicken, spicy mayo, pickles, fresh lettuce',
    },
    price: 95,
    image: 'https://images.pexels.com/photos/3727243/pexels-photo-3727243.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    categoryId: 'burgers',
  },
  {
    id: 'b5',
    name: {
      ar: 'برغر اللحم المشوي',
      fr: 'Grilled Beef Burger',
      en: 'Grilled Beef Burger',
    },
    description: {
      ar: 'لحم مشوي على الفحم، جبن موزاريلا، صلصة الثوم',
      fr: 'Boeuf grillé au charbon, mozzarella, sauce à l\'ail',
      en: 'Charcoal-grilled beef, mozzarella, garlic sauce',
    },
    price: 100,
    image: 'https://images.pexels.com/photos/11812583/pexels-photo-11812583.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    categoryId: 'burgers',
  },

  // === SANDWICHES ===
  {
    id: 's1',
    name: {
      ar: 'بانيني الديك الرومي',
      fr: 'Panini Dinde',
      en: 'Turkey Panini',
    },
    description: {
      ar: 'ديك رومي، جبن سويسري، طماطم مجففة، ريحان',
      fr: 'Dinde, fromage suisse, tomates séchées, basilic',
      en: 'Turkey, Swiss cheese, sun-dried tomatoes, basil',
    },
    price: 70,
    image: 'https://images.pexels.com/photos/32715053/pexels-photo-32715053.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    categoryId: 'sandwiches',
  },
  {
    id: 's2',
    name: {
      ar: 'بانيني الخضار المشوية',
      fr: 'Panini Légumes Grillés',
      en: 'Grilled Veggie Panini',
    },
    description: {
      ar: 'كوسة، باذنجان، فلفل مشوي، جبن الموزاريلا',
      fr: 'Courgette, aubergine, poivron grillé, mozzarella',
      en: 'Zucchini, eggplant, grilled pepper, mozzarella',
    },
    price: 65,
    image: 'https://images.pexels.com/photos/29614913/pexels-photo-29614913.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    categoryId: 'sandwiches',
  },
  {
    id: 's3',
    name: {
      ar: 'كلوب ساندويتش',
      fr: 'Club Sandwich',
      en: 'Club Sandwich',
    },
    description: {
      ar: 'دجاج مشوي، بيكون، خس، طماطم، ثلاث طبقات',
      fr: 'Poulet grillé, bacon, salade, tomate, trois étages',
      en: 'Grilled chicken, bacon, lettuce, tomato, triple decker',
    },
    price: 80,
    image: 'https://images.pexels.com/photos/25225626/pexels-photo-25225626.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    categoryId: 'sandwiches',
    promo: {
      discountPercent: 15,
      oldPrice: 95,
    },
  },
  {
    id: 's4',
    name: {
      ar: 'بانيني الجبن المشكل',
      fr: 'Panini Fromage Mixte',
      en: 'Mixed Cheese Panini',
    },
    description: {
      ar: 'جبن شيدر، موزاريلا، جبن أزرق، سبانخ طازج',
      fr: 'Cheddar, mozzarella, bleu, épinards frais',
      en: 'Cheddar, mozzarella, blue cheese, fresh spinach',
    },
    price: 60,
    image: 'https://images.pexels.com/photos/1885578/pexels-photo-1885578.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    categoryId: 'sandwiches',
  },

  // === STARTERS ===
  {
    id: 'st1',
    name: {
      ar: 'أجنحة دجاج حارة',
      fr: 'Ailes de Poulet Épicées',
      en: 'Spicy Chicken Wings',
    },
    description: {
      ar: '8 قطع، صلصة البافالو الحارة، صلصة الرانش',
      fr: '8 pièces, sauce buffalo épicée, ranch',
      en: '8 pieces, spicy buffalo sauce, ranch dip',
    },
    price: 75,
    image: 'https://images.pexels.com/photos/9650084/pexels-photo-9650084.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    categoryId: 'starters',
  },
  {
    id: 'st2',
    name: {
      ar: 'أجنحة دجاج مقرمشة',
      fr: 'Ailes Croustillantes',
      en: 'Crispy Wings',
    },
    description: {
      ar: '6 قطع، طعم كلاسيكي مقرمش، صلصة الثوم',
      fr: '6 pièces, croustillant classique, sauce à l\'ail',
      en: '6 pieces, classic crispy, garlic sauce',
    },
    price: 65,
    image: 'https://images.pexels.com/photos/16892378/pexels-photo-16892378.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    categoryId: 'starters',
  },
  {
    id: 'st3',
    name: {
      ar: 'دجاج مقلي حار',
      fr: 'Poulet Frit Épicé',
      en: 'Spicy Fried Chicken',
    },
    description: {
      ar: 'قطع دجاج متبلة، فلفل أحمر حار، صلصة خاصة',
      fr: 'Morceaux marinés, piment rouge, sauce spéciale',
      en: 'Marinated chicken pieces, hot red pepper, special sauce',
    },
    price: 90,
    image: 'https://images.pexels.com/photos/6941026/pexels-photo-6941026.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    categoryId: 'starters',
    promo: {
      discountPercent: 25,
      oldPrice: 120,
    },
  },

  // === DRINKS ===
  {
    id: 'd1',
    name: {
      ar: 'عصير برتقال طازج',
      fr: 'Jus d\'Orange Frais',
      en: 'Fresh Orange Juice',
    },
    description: {
      ar: 'برتقال طبيعي 100٪، مع الثلج',
      fr: 'Orange naturelle 100%, avec glace',
      en: '100% natural orange, served with ice',
    },
    price: 35,
    image: 'https://images.pexels.com/photos/17612820/pexels-photo-17612820.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    categoryId: 'drinks',
  },
  {
    id: 'd2',
    name: {
      ar: 'سموثي أخضر',
      fr: 'Smoothie Vert',
      en: 'Green Smoothie',
    },
    description: {
      ar: 'سبانخ، تفاح أخضر، موز، نعناع',
      fr: 'Épinards, pomme verte, banane, menthe',
      en: 'Spinach, green apple, banana, mint',
    },
    price: 45,
    image: 'https://images.pexels.com/photos/17612826/pexels-photo-17612826.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    categoryId: 'drinks',
  },
  {
    id: 'd3',
    name: {
      ar: 'سموثي المانجو',
      fr: 'Smoothie Mangue',
      en: 'Mango Smoothie',
    },
    description: {
      ar: 'مانجو طبيعي، حليب جوز الهند، ثلج',
      fr: 'Mangue naturelle, lait de coco, glace',
      en: 'Natural mango, coconut milk, ice',
    },
    price: 40,
    image: 'https://images.pexels.com/photos/17612822/pexels-photo-17612822.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    categoryId: 'drinks',
    promo: {
      discountPercent: 30,
      oldPrice: 55,
    },
  },
  {
    id: 'd4',
    name: {
      ar: 'قهوة مثلجة',
      fr: 'Café Glacé',
      en: 'Iced Coffee',
    },
    description: {
      ar: 'إسبريسو، حليب بارد، ثلج، كراميل',
      fr: 'Espresso, lait froid, glace, caramel',
      en: 'Espresso, cold milk, ice, caramel',
    },
    price: 38,
    image: 'https://images.pexels.com/photos/4869290/pexels-photo-4869290.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    categoryId: 'drinks',
  },
  {
    id: 'd5',
    name: {
      ar: 'سموثي الفراولة',
      fr: 'Smoothie Fraise',
      en: 'Strawberry Smoothie',
    },
    description: {
      ar: 'فراولة طازجة، زبادي، عسل، ثلج',
      fr: 'Fraises fraîches, yaourt, miel, glace',
      en: 'Fresh strawberries, yogurt, honey, ice',
    },
    price: 42,
    image: 'https://images.pexels.com/photos/28117065/pexels-photo-28117065.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    categoryId: 'drinks',
  },

  // === DESSERTS ===
  {
    id: 'ds1',
    name: {
      ar: 'تشيز كيك بالتوت',
      fr: 'Cheesecake aux Fruits',
      en: 'Berry Cheesecake',
    },
    description: {
      ar: 'تشيز كيك كريمي، توت مشكل، صلصة الفراولة',
      fr: 'Cheesecake crémeux, fruits rouges, coulis fraise',
      en: 'Creamy cheesecake, mixed berries, strawberry coulis',
    },
    price: 55,
    image: 'https://images.pexels.com/photos/4669235/pexels-photo-4669235.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    categoryId: 'desserts',
  },
  {
    id: 'ds2',
    name: {
      ar: 'تيراميسو',
      fr: 'Tiramisu',
      en: 'Tiramisu',
    },
    description: {
      ar: 'طبقات البسكويت، قهوة إسبريسو، كريم الماسكاربوني',
      fr: 'Biscuits, espresso, crème mascarpone',
      en: 'Ladyfingers, espresso, mascarpone cream',
    },
    price: 50,
    image: 'https://images.pexels.com/photos/10169991/pexels-photo-10169991.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    categoryId: 'desserts',
  },
  {
    id: 'ds3',
    name: {
      ar: 'كيك الشوكولاتة الذائب',
      fr: 'Fondant au Chocolat',
      en: 'Chocolate Lava Cake',
    },
    description: {
      ar: 'قلب الشوكولاتة السائل، آيس كريم الفانيليا',
      fr: 'Cœur coulant chocolat, glace vanille',
      en: 'Molten chocolate center, vanilla ice cream',
    },
    price: 60,
    image: 'https://images.pexels.com/photos/10480244/pexels-photo-10480244.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    categoryId: 'desserts',
    promo: {
      discountPercent: 15,
      oldPrice: 70,
    },
  },
  {
    id: 'ds4',
    name: {
      ar: 'براوني الشوكولاتة',
      fr: 'Brownie au Chocolat',
      en: 'Chocolate Brownie',
    },
    description: {
      ar: 'براوني دافئ، صلصة الشوكولاتة، توت طازج',
      fr: 'Brownie chaud, sauce chocolat, fruits frais',
      en: 'Warm brownie, chocolate sauce, fresh berries',
    },
    price: 48,
    image: 'https://images.pexels.com/photos/33312981/pexels-photo-33312981.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    categoryId: 'desserts',
  },
]
  // Cover-first, de-duplicated, blanks dropped — the same shape `buildGallery`
  // produces for a real API response.
  .map((product: MockProduct): Product => ({
    ...product,
    gallery: Array.from(
      new Set(
        [product.image, ...(product.gallery ?? [])].filter((url) => Boolean(url && url.trim())),
      ),
    ),
  }));
