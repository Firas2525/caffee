import { pool, closeDatabase } from '../config/database.js';

const categories = [
  ['cat_hot', 'مشروبات ساخنة', '☕', '#D4A373'],
  ['cat_cold', 'مشروبات باردة وعصائر', '🧃', '#00B4D8'],
  ['cat_shisha', 'أراكيل وشيشة', '💨', '#E76F51'],
  ['cat_desserts', 'حلويات ومسليات', '🍰', '#F4A261'],
];

const items = [
  ['item_hot_1', 'cat_hot', 'قهوة تركية بالهيل', 12, '☕', 'قهوة تركية محمصة غنية بالهيل'],
  ['item_hot_2', 'cat_hot', 'قهوة فرنسية بالحليب', 15, '☕', 'مزيج فاخر بالبندق والحليب'],
  ['item_hot_3', 'cat_hot', 'شاي كرك عدني', 10, '🫖', 'شاي كرك مطبوخ مع الهيل والزعفران'],
  ['item_cold_1', 'cat_cold', 'موهيتو توت أزرق', 20, '🍹', 'موهيتو منعش مع الليمون والنعناع'],
  ['item_cold_2', 'cat_cold', 'عصير برتقال طازج', 16, '🍊', 'عصير برتقال طبيعي 100%'],
  ['item_shisha_1', 'cat_shisha', 'أركيلة تفاحتين نخيل', 35, '💨', 'تفاحتين نخلة مع رأس فخار'],
  ['item_shisha_5', 'cat_shisha', 'أركيلة ميكس أبو الزوز الملكي', 45, '👑', 'خلطة خاصة بمقهى أبو الزوز'],
  ['item_dessert_1', 'cat_desserts', 'وافل نوتيلا وفراولة', 26, '🧇', 'وافل مقرمش مع صوص النوتيلا والفراولة'],
];

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const category of categories) {
      await client.query(
        `INSERT INTO categories (id, name, icon, color_hex)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon, color_hex = EXCLUDED.color_hex`,
        category,
      );
    }
    for (const item of items) {
      await client.query(
        `INSERT INTO items (id, category_id, name, price, icon, description)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET
           category_id = EXCLUDED.category_id, name = EXCLUDED.name, price = EXCLUDED.price,
           icon = EXCLUDED.icon, description = EXCLUDED.description`,
        item,
      );
    }
    for (let number = 1; number <= 12; number += 1) {
      const id = `table_${number}`;
      const name = number === 1 ? 'طاولة VIP 1' : number === 2 ? 'طاولة VIP 2' : `طاولة ${number}`;
      await client.query(
        `INSERT INTO cafe_tables (id, table_number, table_name)
         VALUES ($1, $2, $3)
         ON CONFLICT (id) DO NOTHING`,
        [id, number, name],
      );
    }
    await client.query('COMMIT');
    console.log('Database seed completed');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

seed()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(closeDatabase);
