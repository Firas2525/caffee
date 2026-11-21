CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '☕',
  color_hex TEXT NOT NULL DEFAULT '#D4A373',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
  icon TEXT NOT NULL DEFAULT '🍽️',
  image_url TEXT,
  description TEXT NOT NULL DEFAULT '',
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE items
  ADD COLUMN IF NOT EXISTS image_url TEXT;

CREATE TABLE IF NOT EXISTS cafe_tables (
  id TEXT PRIMARY KEY,
  table_number INTEGER NOT NULL UNIQUE,
  table_name TEXT NOT NULL,
  is_occupied BOOLEAN NOT NULL DEFAULT FALSE,
  opened_at TIMESTAMPTZ,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS table_orders (
  id TEXT PRIMARY KEY,
  table_id TEXT NOT NULL REFERENCES cafe_tables(id) ON DELETE CASCADE,
  item_id TEXT REFERENCES items(id) ON DELETE SET NULL,
  item_name TEXT NOT NULL,
  unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  icon TEXT NOT NULL DEFAULT '🍽️',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(table_id, item_id)
);

CREATE TABLE IF NOT EXISTS bills (
  id TEXT PRIMARY KEY,
  table_number INTEGER NOT NULL,
  table_name TEXT NOT NULL,
  subtotal NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0),
  discount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
  total NUMERIC(12, 2) NOT NULL CHECK (total >= 0),
  opened_at TIMESTAMPTZ NOT NULL,
  closed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payment_method TEXT NOT NULL DEFAULT 'نقدًا',
  created_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_by_name TEXT NOT NULL DEFAULT 'غير معروف'
);

ALTER TABLE bills
  ADD COLUMN IF NOT EXISTS created_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE bills
  ADD COLUMN IF NOT EXISTS created_by_name TEXT NOT NULL DEFAULT 'غير معروف';

CREATE TABLE IF NOT EXISTS bill_items (
  id TEXT PRIMARY KEY,
  bill_id TEXT NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  item_id TEXT,
  item_name TEXT NOT NULL,
  unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  icon TEXT NOT NULL DEFAULT '🍽️',
  notes TEXT NOT NULL DEFAULT ''
);
