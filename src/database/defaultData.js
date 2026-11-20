export const defaultCategories = [
  ['cat_hot', 'مشروبات ساخنة', '☕', '#D4A373'],
  ['cat_cold', 'مشروبات باردة وعصائر', '🧃', '#00B4D8'],
  ['cat_shisha', 'أراكيل وشيشة', '💨', '#E76F51'],
  ['cat_desserts', 'حلويات ومسليات', '🍰', '#F4A261'],
];

export const defaultItems = [
  ['item_hot_1', 'cat_hot', 'قهوة تركية بالهيل', 12, '☕', 'قهوة تركية محمصة غنية بالهيل'],
  ['item_hot_2', 'cat_hot', 'قهوة فرنسية بالحليب', 15, '☕', 'مزيج فاخر بالبندق والحليب'],
  ['item_hot_3', 'cat_hot', 'شاي كرك عدني', 10, '🫖', 'شاي كرك مطبوخ مع الهيل والزعفران'],
  ['item_hot_4', 'cat_hot', 'كابتشينو إيطالي', 16, '☕', 'إسبريسو غني مع رغوة الحليب الكثيفة'],
  ['item_hot_5', 'cat_hot', 'شاي أحمر خمير (إبريق)', 14, '🫖', 'إبريق شاي ساخن مع ورق النعناع الطازج'],
  ['item_hot_6', 'cat_hot', 'سحلب مكسرات وقرفة', 18, '🥛', 'سحلب شتوي ساخن مع المكسرات والقرفة'],
  ['item_hot_7', 'cat_hot', 'إسبريسو دبل', 14, '☕', 'جرعة مركزة من البن الإيطالي المحمص'],
  ['item_cold_1', 'cat_cold', 'موهيتو توت أزرق', 20, '🍹', 'موهيتو منعش مع الليمون والنعناع وسيرب البلوبيري'],
  ['item_cold_2', 'cat_cold', 'عصير برتقال طازج', 16, '🍊', 'عصير برتقال طبيعي 100% معصور طازجاً'],
  ['item_cold_3', 'cat_cold', 'ليمون ونعناع مثلج', 16, '🍋', 'عصير ليمون طبيعي مثلج مع أوراق النعناع'],
  ['item_cold_4', 'cat_cold', 'أفوكادو عسل ومكسرات', 25, '🥑', 'عصير أفوكادو مع العسل والمكسرات والقشطة'],
  ['item_cold_5', 'cat_cold', 'سبانش لاتيه بارد', 22, '🥤', 'قهوة مع الحليب المكثف المحلى والثلج'],
  ['item_cold_6', 'cat_cold', 'ميلك شيك نوتيلا', 22, '🥤', 'ميلك شيك شوكولاتة نوتيلا مع الكريمة'],
  ['item_shisha_1', 'cat_shisha', 'أركيلة تفاحتين نخيل', 35, '💨', 'تفاحتين نخلة مع رأس فخار وفحم طبيعي ممتاز'],
  ['item_shisha_2', 'cat_shisha', 'أركيلة تفاحتين فاخر', 35, '💨', 'تفاحتين الفاخر أصلية برأس طيني فاخر'],
  ['item_shisha_3', 'cat_shisha', 'أركيلة عنب توت فاخر', 38, '🍇', 'مزيج العنب والتوت البري المنعش'],
  ['item_shisha_4', 'cat_shisha', 'أركيلة ليمون ونعناع', 35, '🍋', 'نكهة حمضية باردة ومنعشة'],
  ['item_shisha_5', 'cat_shisha', 'أركيلة ميكس أبو الزوز الملكي', 45, '👑', 'خلطة سرية خاصة بمقهى أبو الزوز تدوم طويلاً'],
  ['item_shisha_6', 'cat_shisha', 'تغيير رأس أركيلة', 20, '🔥', 'تجديد رأس الأركيلة مع تنظيف الفحم'],
  ['item_dessert_1', 'cat_desserts', 'وافل نوتيلا وفراولة', 26, '🧇', 'وافل مقرمش مغطى بصوص النوتيلا وقطع الفراولة'],
  ['item_dessert_2', 'cat_desserts', 'كريب كندر وشوكولاتة بلجيكية', 28, '🥞', 'كريب طازج محشو بأصابع الكندر والشوكولاتة'],
  ['item_dessert_3', 'cat_desserts', 'تشيز كيك فراولة', 22, '🍰', 'قطعة تشيز كيك كريمية مع مربى الفراولة'],
  ['item_dessert_4', 'cat_desserts', 'صحن مكسرات فاخرة مشكلة', 18, '🥜', 'مكسرات مشكلة محمصة طازجة'],
];

export async function seedMenu(client, { reset = false } = {}) {
  if (reset) {
    await client.query('DELETE FROM items');
    await client.query('DELETE FROM categories');
  }

  for (const category of defaultCategories) {
    await client.query(
      `INSERT INTO categories (id, name, icon, color_hex)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name, icon = EXCLUDED.icon, color_hex = EXCLUDED.color_hex`,
      category,
    );
  }

  for (const item of defaultItems) {
    await client.query(
      `INSERT INTO items (id, category_id, name, price, icon, description)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET
         category_id = EXCLUDED.category_id, name = EXCLUDED.name,
         price = EXCLUDED.price, icon = EXCLUDED.icon,
         description = EXCLUDED.description`,
      item,
    );
  }
}
