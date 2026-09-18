CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  duration INTEGER NOT NULL,
  end_time TEXT NOT NULL,
  players INTEGER NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  notes TEXT DEFAULT '',
  amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed'
);
CREATE TABLE IF NOT EXISTS booking_slots (
  date TEXT NOT NULL,
  slot_time TEXT NOT NULL,
  booking_id TEXT NOT NULL,
  PRIMARY KEY (date, slot_time),
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(date);
