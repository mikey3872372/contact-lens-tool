const { Pool } = require('pg');

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Initialize database tables
async function initializeDatabase() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Create practices table
    await client.query(`
      CREATE TABLE IF NOT EXISTS practices (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        is_master_admin BOOLEAN DEFAULT FALSE,
        new_wearer_rebate_q1 DECIMAL(10,2) DEFAULT 0,
        new_wearer_rebate_q2 DECIMAL(10,2) DEFAULT 0,
        new_wearer_rebate_q3 DECIMAL(10,2) DEFAULT 0,
        new_wearer_rebate_q4 DECIMAL(10,2) DEFAULT 0,
        existing_wearer_rebate_q1 DECIMAL(10,2) DEFAULT 0,
        existing_wearer_rebate_q2 DECIMAL(10,2) DEFAULT 0,
        existing_wearer_rebate_q3 DECIMAL(10,2) DEFAULT 0,
        existing_wearer_rebate_q4 DECIMAL(10,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create global_lens_brands table
    await client.query(`
      CREATE TABLE IF NOT EXISTS global_lens_brands (
        id SERIAL PRIMARY KEY,
        brand_name TEXT NOT NULL UNIQUE,
        boxes_per_annual INTEGER NOT NULL,
        competitor_price_per_box DECIMAL(10,2) DEFAULT 0,
        competitor_annual_rebate DECIMAL(10,2) DEFAULT 0,
        competitor_semiannual_rebate DECIMAL(10,2) DEFAULT 0,
        competitor_first_time_discount_percent DECIMAL(5,2) DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create practice_pricing table
    await client.query(`
      CREATE TABLE IF NOT EXISTS practice_pricing (
        id SERIAL PRIMARY KEY,
        practice_id INTEGER REFERENCES practices(id),
        global_brand_id INTEGER REFERENCES global_lens_brands(id),
        practice_price_per_box DECIMAL(10,2) DEFAULT 0,
        practice_manufacturer_rebate_new DECIMAL(10,2) DEFAULT 0,
        practice_manufacturer_rebate_existing DECIMAL(10,2) DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(practice_id, global_brand_id)
      )
    `);

    // Create master admin if doesn't exist
    const adminCheck = await client.query('SELECT id FROM practices WHERE is_master_admin = TRUE LIMIT 1');
    if (adminCheck.rows.length === 0) {
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('masteradmin123', 10);
      await client.query(`
        INSERT INTO practices (name, email, password, is_master_admin) 
        VALUES ($1, $2, $3, $4)
      `, ['Master Admin', 'admin@contactlenstool.com', hashedPassword, true]);
    }

    // Insert default brands if none exist
    const brandsCheck = await client.query('SELECT id FROM global_lens_brands LIMIT 1');
    if (brandsCheck.rows.length === 0) {
      const brands = [
        { name: 'Acuvue Oasys', boxes: 4, price: 52.99, annual: 25.00, semi: 15.00, discount: 10.0 },
        { name: 'Dailies Total1', boxes: 12, price: 49.99, annual: 30.00, semi: 20.00, discount: 15.0 },
        { name: 'Air Optix Aqua', boxes: 4, price: 38.99, annual: 20.00, semi: 12.00, discount: 8.0 },
        { name: 'Biofinity', boxes: 4, price: 35.99, annual: 18.00, semi: 10.00, discount: 5.0 },
        { name: 'Acuvue Moist', boxes: 12, price: 45.99, annual: 25.00, semi: 15.00, discount: 10.0 }
      ];

      for (const brand of brands) {
        await client.query(`
          INSERT INTO global_lens_brands 
          (brand_name, boxes_per_annual, competitor_price_per_box, competitor_annual_rebate, 
           competitor_semiannual_rebate, competitor_first_time_discount_percent) 
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [brand.name, brand.boxes, brand.price, brand.annual, brand.semi, brand.discount]);
      }
    }

    await client.query('COMMIT');
    console.log('Database initialized successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Database initialization error:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Helper function to get current quarter
function getCurrentQuarter() {
  const month = new Date().getMonth() + 1;
  if (month <= 3) return 'q1';
  if (month <= 6) return 'q2';
  if (month <= 9) return 'q3';
  return 'q4';
}

module.exports = { pool, initializeDatabase, getCurrentQuarter };