const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// For Vercel deployment
if (process.env.NODE_ENV === 'production') {
  module.exports = app;
}
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(express.json());

// Database setup
const db = new sqlite3.Database('./contact-lens.db', (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
    initializeDatabase();
  }
});

// Initialize database tables
function initializeDatabase() {
  db.serialize(() => {
    // Create practices table
    db.run(`
      CREATE TABLE IF NOT EXISTS practices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        is_master_admin BOOLEAN DEFAULT 0,
        new_wearer_rebate_q1 REAL DEFAULT 0,
        new_wearer_rebate_q2 REAL DEFAULT 0,
        new_wearer_rebate_q3 REAL DEFAULT 0,
        new_wearer_rebate_q4 REAL DEFAULT 0,
        existing_wearer_rebate_q1 REAL DEFAULT 0,
        existing_wearer_rebate_q2 REAL DEFAULT 0,
        existing_wearer_rebate_q3 REAL DEFAULT 0,
        existing_wearer_rebate_q4 REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create global_lens_brands table (managed by master admin)
    db.run(`
      CREATE TABLE IF NOT EXISTS global_lens_brands (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        brand_name TEXT NOT NULL UNIQUE,
        boxes_per_annual INTEGER NOT NULL,
        competitor_annual_rebate REAL DEFAULT 0,
        competitor_semiannual_rebate REAL DEFAULT 0,
        competitor_first_time_discount_percent REAL DEFAULT 0,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add new columns to existing global_lens_brands table if they don't exist
    db.run(`ALTER TABLE global_lens_brands ADD COLUMN competitor_price_per_box REAL DEFAULT 0`, () => {});
    db.run(`ALTER TABLE global_lens_brands ADD COLUMN competitor_annual_rebate REAL DEFAULT 0`, () => {});
    db.run(`ALTER TABLE global_lens_brands ADD COLUMN competitor_semiannual_rebate REAL DEFAULT 0`, () => {});
    db.run(`ALTER TABLE global_lens_brands ADD COLUMN competitor_first_time_discount_percent REAL DEFAULT 0`, () => {});
    
    // Remove old columns if they exist
    db.run(`ALTER TABLE global_lens_brands DROP COLUMN replacement_schedule`, () => {});
    db.run(`ALTER TABLE global_lens_brands DROP COLUMN manufacturer_rebate_new_wearer`, () => {});
    db.run(`ALTER TABLE global_lens_brands DROP COLUMN manufacturer_rebate_existing_wearer`, () => {});

    // Create practice_pricing table (practice-specific pricing and manufacturer rebates)
    db.run(`
      CREATE TABLE IF NOT EXISTS practice_pricing (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        practice_id INTEGER,
        global_brand_id INTEGER,
        practice_price_per_box REAL DEFAULT 0,
        practice_manufacturer_rebate_new REAL DEFAULT 0,
        practice_manufacturer_rebate_existing REAL DEFAULT 0,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (practice_id) REFERENCES practices (id),
        FOREIGN KEY (global_brand_id) REFERENCES global_lens_brands (id),
        UNIQUE(practice_id, global_brand_id)
      )
    `);

    // Add manufacturer rebate columns to existing practice_pricing table if they don't exist
    db.run(`ALTER TABLE practice_pricing ADD COLUMN practice_manufacturer_rebate_new REAL DEFAULT 0`, () => {});
    db.run(`ALTER TABLE practice_pricing ADD COLUMN practice_manufacturer_rebate_existing REAL DEFAULT 0`, () => {});

    // Create master admin account if it doesn't exist
    db.get('SELECT id FROM practices WHERE is_master_admin = 1', (err, row) => {
      if (!row) {
        const bcrypt = require('bcrypt');
        bcrypt.hash('masteradmin123', 10, (err, hash) => {
          if (!err) {
            db.run(`
              INSERT INTO practices (name, email, password, is_master_admin) 
              VALUES ('Master Admin', 'admin@contactlenstool.com', ?, 1)
            `, [hash]);
          }
        });
      }
    });

    // Insert some default global brands if none exist
    db.get('SELECT id FROM global_lens_brands LIMIT 1', (err, row) => {
      if (!row) {
        const brands = [
          {
            name: 'Acuvue Oasys',
            schedule: 'biweekly',
            boxes: 4,
            competitor_price: 52.99,
            rebate_new: 100.00,
            rebate_existing: 50.00
          },
          {
            name: 'Dailies Total1',
            schedule: 'daily',
            boxes: 12,
            competitor_price: 49.99,
            rebate_new: 150.00,
            rebate_existing: 75.00
          },
          {
            name: 'Air Optix Aqua',
            schedule: 'monthly',
            boxes: 4,
            competitor_price: 38.99,
            rebate_new: 80.00,
            rebate_existing: 40.00
          }
        ];

        brands.forEach(brand => {
          db.run(`
            INSERT INTO global_lens_brands 
            (brand_name, replacement_schedule, boxes_per_annual, competitor_price_per_box, 
             manufacturer_rebate_new_wearer, manufacturer_rebate_existing_wearer) 
            VALUES (?, ?, ?, ?, ?, ?)
          `, [brand.name, brand.schedule, brand.boxes, brand.competitor_price, 
              brand.rebate_new, brand.rebate_existing]);
        });
      }
    });
  });
}

// Helper function to get current quarter
function getCurrentQuarter() {
  const month = new Date().getMonth() + 1; // getMonth() returns 0-11
  if (month <= 3) return 'q1';
  if (month <= 6) return 'q2';
  if (month <= 9) return 'q3';
  return 'q4';
}

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running!' });
});

// User registration
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    db.run(
      'INSERT INTO practices (name, email, password) VALUES (?, ?, ?)',
      [name, email, hashedPassword],
      function(err) {
        if (err) {
          if (err.code === 'SQLITE_CONSTRAINT') {
            return res.status(400).json({ error: 'Email already exists' });
          }
          return res.status(500).json({ error: 'Database error' });
        }
        
        const token = jwt.sign({ id: this.lastID, email }, JWT_SECRET);
        res.status(201).json({
          message: 'Practice registered successfully',
          token,
          practice: { id: this.lastID, name, email }
        });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// User login
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  db.get(
    'SELECT * FROM practices WHERE email = ?',
    [email],
    async (err, practice) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (!practice) {
        return res.status(400).json({ error: 'Invalid credentials' });
      }

      const isValidPassword = await bcrypt.compare(password, practice.password);
      if (!isValidPassword) {
        return res.status(400).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign({ id: practice.id, email: practice.email }, JWT_SECRET);
      res.json({
        message: 'Login successful',
        token,
        practice: { id: practice.id, name: practice.name, email: practice.email }
      });
    }
  );
});

// Protected routes
app.get('/api/profile', authenticateToken, (req, res) => {
  db.get(
    'SELECT id, name, email FROM practices WHERE id = ?',
    [req.user.id],
    (err, practice) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(practice);
    }
  );
});

// ============================================
// MASTER ADMIN ROUTES (Global Brand Management)
// ============================================

// Get all global brands (master admin only)
app.get('/api/admin/global-brands', authenticateToken, (req, res) => {
  // Check if user is master admin
  db.get('SELECT is_master_admin FROM practices WHERE id = ?', [req.user.id], (err, user) => {
    if (err || !user || !user.is_master_admin) {
      return res.status(403).json({ error: 'Access denied. Master admin only.' });
    }

    db.all('SELECT * FROM global_lens_brands ORDER BY brand_name', (err, brands) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(brands);
    });
  });
});

// Add/Update global brand (master admin only)
app.post('/api/admin/global-brands', authenticateToken, (req, res) => {
  const {
    brand_name,
    boxes_per_annual,
    competitor_price_per_box,
    competitor_annual_rebate,
    competitor_semiannual_rebate,
    competitor_first_time_discount_percent
  } = req.body;

  // Check if user is master admin
  db.get('SELECT is_master_admin FROM practices WHERE id = ?', [req.user.id], (err, user) => {
    if (err || !user || !user.is_master_admin) {
      return res.status(403).json({ error: 'Access denied. Master admin only.' });
    }

    if (!brand_name || !boxes_per_annual) {
      return res.status(400).json({ error: 'Brand name and boxes per year are required' });
    }

    // Check if we're updating an existing brand (if ID is provided)
    const id = req.body.id;
    
    if (id) {
      // Update existing brand
      db.run(`
        UPDATE global_lens_brands 
        SET brand_name = ?, boxes_per_annual = ?, competitor_price_per_box = ?, competitor_annual_rebate = ?, 
            competitor_semiannual_rebate = ?, competitor_first_time_discount_percent = ?
        WHERE id = ?
      `, [
        brand_name,
        parseInt(boxes_per_annual),
        parseFloat(competitor_price_per_box) || 0,
        parseFloat(competitor_annual_rebate) || 0,
        parseFloat(competitor_semiannual_rebate) || 0,
        parseFloat(competitor_first_time_discount_percent) || 0,
        id
      ], function(err) {
        if (err) {
          console.error('Database update error:', err);
          return res.status(500).json({ error: 'Database error: ' + err.message });
        }
        res.json({ message: 'Global brand updated successfully', id: id });
      });
    } else {
      // Insert new brand
      db.run(`
        INSERT INTO global_lens_brands 
        (brand_name, boxes_per_annual, competitor_price_per_box, competitor_annual_rebate, competitor_semiannual_rebate, competitor_first_time_discount_percent) 
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        brand_name,
        parseInt(boxes_per_annual),
        parseFloat(competitor_price_per_box) || 0,
        parseFloat(competitor_annual_rebate) || 0,
        parseFloat(competitor_semiannual_rebate) || 0,
        parseFloat(competitor_first_time_discount_percent) || 0
      ], function(err) {
        if (err) {
          console.error('Database insert error:', err);
          return res.status(500).json({ error: 'Database error: ' + err.message });
        }
        res.json({ message: 'Global brand created successfully', id: this.lastID });
      });
    }
  });
});

// ============================================
// PRACTICE ROUTES (Practice-Specific Management)
// ============================================

// Get available brands for practice pricing setup
app.get('/api/available-brands', authenticateToken, (req, res) => {
  db.all(`
    SELECT 
      gb.*,
      pp.practice_price_per_box,
      pp.practice_manufacturer_rebate_new,
      pp.practice_manufacturer_rebate_existing,
      pp.is_active as practice_active
    FROM global_lens_brands gb
    LEFT JOIN practice_pricing pp ON gb.id = pp.global_brand_id AND pp.practice_id = ?
    WHERE gb.is_active = 1
    ORDER BY gb.brand_name
  `, [req.user.id], (err, brands) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(brands);
  });
});

// Update practice pricing for a brand
app.post('/api/practice-pricing', authenticateToken, (req, res) => {
  const { 
    global_brand_id, 
    practice_price_per_box,
    practice_manufacturer_rebate_new,
    practice_manufacturer_rebate_existing
  } = req.body;

  if (!global_brand_id) {
    return res.status(400).json({ error: 'Brand ID is required' });
  }

  // Build the update fields dynamically based on what's provided
  const updateFields = [];
  const updateValues = [];
  
  if (practice_price_per_box !== undefined) {
    updateFields.push('practice_price_per_box = ?');
    updateValues.push(practice_price_per_box);
  }
  
  if (practice_manufacturer_rebate_new !== undefined) {
    updateFields.push('practice_manufacturer_rebate_new = ?');
    updateValues.push(practice_manufacturer_rebate_new);
  }
  
  if (practice_manufacturer_rebate_existing !== undefined) {
    updateFields.push('practice_manufacturer_rebate_existing = ?');
    updateValues.push(practice_manufacturer_rebate_existing);
  }

  if (updateFields.length === 0) {
    return res.status(400).json({ error: 'At least one field to update is required' });
  }

  // Check if record exists first
  db.get(`
    SELECT id FROM practice_pricing 
    WHERE practice_id = ? AND global_brand_id = ?
  `, [req.user.id, global_brand_id], (err, existing) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (existing) {
      // Update existing record
      updateValues.push(req.user.id, global_brand_id);
      db.run(`
        UPDATE practice_pricing 
        SET ${updateFields.join(', ')}, created_at = CURRENT_TIMESTAMP
        WHERE practice_id = ? AND global_brand_id = ?
      `, updateValues, function(err) {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        res.json({ message: 'Practice data updated successfully' });
      });
    } else {
      // Create new record with provided values and defaults for missing fields
      db.run(`
        INSERT INTO practice_pricing 
        (practice_id, global_brand_id, practice_price_per_box, practice_manufacturer_rebate_new, practice_manufacturer_rebate_existing, is_active) 
        VALUES (?, ?, ?, ?, ?)
      `, [
        req.user.id, 
        global_brand_id, 
        practice_price_per_box || 0,
        practice_manufacturer_rebate_new || 0,
        practice_manufacturer_rebate_existing || 0
      ], function(err) {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        res.json({ message: 'Practice data created successfully' });
      });
    }
  });
});

// Get practice settings (quarterly rebates)
app.get('/api/practice-settings', authenticateToken, (req, res) => {
  db.get(`
    SELECT 
      new_wearer_rebate_q1, new_wearer_rebate_q2, new_wearer_rebate_q3, new_wearer_rebate_q4,
      existing_wearer_rebate_q1, existing_wearer_rebate_q2, existing_wearer_rebate_q3, existing_wearer_rebate_q4
    FROM practices 
    WHERE id = ?
  `, [req.user.id], (err, settings) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(settings || {});
  });
});

// Update practice settings (quarterly rebates)
app.post('/api/practice-settings', authenticateToken, (req, res) => {
  const {
    new_wearer_rebate_q1, new_wearer_rebate_q2, new_wearer_rebate_q3, new_wearer_rebate_q4,
    existing_wearer_rebate_q1, existing_wearer_rebate_q2, existing_wearer_rebate_q3, existing_wearer_rebate_q4
  } = req.body;

  db.run(`
    UPDATE practices 
    SET new_wearer_rebate_q1 = ?, new_wearer_rebate_q2 = ?, new_wearer_rebate_q3 = ?, new_wearer_rebate_q4 = ?,
        existing_wearer_rebate_q1 = ?, existing_wearer_rebate_q2 = ?, existing_wearer_rebate_q3 = ?, existing_wearer_rebate_q4 = ?
    WHERE id = ?
  `, [
    new_wearer_rebate_q1 || 0, new_wearer_rebate_q2 || 0, new_wearer_rebate_q3 || 0, new_wearer_rebate_q4 || 0,
    existing_wearer_rebate_q1 || 0, existing_wearer_rebate_q2 || 0, existing_wearer_rebate_q3 || 0, existing_wearer_rebate_q4 || 0,
    req.user.id
  ], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ message: 'Practice settings updated successfully' });
  });
});

// ============================================
// PRICE COMPARISON ROUTES
// ============================================

// Get brands available for comparison (practice has pricing set)
app.get('/api/comparison-brands', authenticateToken, (req, res) => {
  db.all(`
    SELECT 
      gb.id, gb.brand_name, gb.boxes_per_annual, gb.competitor_price_per_box,
      gb.competitor_annual_rebate, gb.competitor_semiannual_rebate, gb.competitor_first_time_discount_percent,
      pp.practice_price_per_box, pp.practice_manufacturer_rebate_new, pp.practice_manufacturer_rebate_existing
    FROM global_lens_brands gb
    INNER JOIN practice_pricing pp ON gb.id = pp.global_brand_id 
    WHERE pp.practice_id = ? AND pp.is_active = 1 AND gb.is_active = 1
    ORDER BY gb.brand_name
  `, [req.user.id], (err, brands) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(brands);
  });
});

// Calculate price comparison
app.post('/api/calculate-comparison', authenticateToken, (req, res) => {
  const { global_brand_id, insurance_benefit, is_new_wearer } = req.body;

  if (!global_brand_id) {
    return res.status(400).json({ error: 'Brand ID is required' });
  }

  // Get brand and pricing data
  const query = `
    SELECT 
      gb.*,
      pp.practice_price_per_box,
      pp.practice_manufacturer_rebate_new,
      pp.practice_manufacturer_rebate_existing,
      p.new_wearer_rebate_q1, p.new_wearer_rebate_q2, p.new_wearer_rebate_q3, p.new_wearer_rebate_q4,
      p.existing_wearer_rebate_q1, p.existing_wearer_rebate_q2, p.existing_wearer_rebate_q3, p.existing_wearer_rebate_q4
    FROM global_lens_brands gb
    INNER JOIN practice_pricing pp ON gb.id = pp.global_brand_id
    INNER JOIN practices p ON pp.practice_id = p.id
    WHERE gb.id = ? AND pp.practice_id = ?
  `;

  db.get(query, [global_brand_id, req.user.id], (err, data) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!data) {
      return res.status(404).json({ error: 'Brand not found or no pricing set' });
    }

    const currentQuarter = getCurrentQuarter();
    
    // Get practice rebate for current quarter
    const practiceRebateNew = data[`new_wearer_rebate_${currentQuarter}`] || 0;
    const practiceRebateExisting = data[`existing_wearer_rebate_${currentQuarter}`] || 0;
    const practiceRebate = is_new_wearer ? practiceRebateNew : practiceRebateExisting;

    // Get manufacturer rebate - NOW USING PRACTICE-SPECIFIC VALUES
    const manufacturerRebate = is_new_wearer ? 
      (data.practice_manufacturer_rebate_new || 0) : 
      (data.practice_manufacturer_rebate_existing || 0);

    // Calculate totals
    const practiceSubtotal = data.practice_price_per_box * data.boxes_per_annual;
    // Use actual 1-800 CONTACTS pricing
    const competitorSubtotal = (data.competitor_price_per_box || 0) * data.boxes_per_annual;
    
    const insuranceBenefit = insurance_benefit || 0;
    
    // Practice pricing: in office today is subtotal minus insurance only
    const practiceInOfficeToday = Math.max(0, practiceSubtotal - insuranceBenefit);
    const practiceAfterRebate = Math.max(0, practiceSubtotal - practiceRebate);
    
    // Total after manufacturer rebate (what customer ultimately pays)
    const practiceAfterAllRebates = Math.max(0, practiceInOfficeToday - manufacturerRebate);
    const practiceFinalAmount = practiceAfterAllRebates;
    
    // Competitor: subtract their annual rebate from subtotal
    const competitorAnnualRebate = data.competitor_annual_rebate || 0;
    const competitorFinalAmount = Math.max(0, competitorSubtotal - competitorAnnualRebate);
    
    // Calculate savings
    const totalSavings = competitorFinalAmount - practiceFinalAmount;
    
    const comparison = {
      brand: {
        id: data.id,
        name: data.brand_name,
        boxes_per_annual: data.boxes_per_annual
      },
      practice: {
        price_per_box: data.practice_price_per_box,
        subtotal: practiceSubtotal,
        practice_rebate: practiceRebate,
        manufacturer_rebate: manufacturerRebate,
        insurance_applied: insuranceBenefit,
        in_office_today: practiceInOfficeToday,
        final_amount_after_rebates: practiceFinalAmount
      },
      competitor: {
        name: "1-800 Contacts",
        price_per_box: data.competitor_price_per_box || 0,
        subtotal: competitorSubtotal,
        annual_rebate: competitorAnnualRebate,
        note: "Out of network - no insurance benefits apply",
        final_amount: competitorFinalAmount
      },
      savings: {
        total_savings: totalSavings,
        percentage_savings: competitorFinalAmount > 0 ? (totalSavings / competitorFinalAmount * 100) : 0
      },
      wearer_status: is_new_wearer ? 'new' : 'existing',
      current_quarter: currentQuarter,
      insurance_benefit: insuranceBenefit
    };

    res.json(comparison);
  });
});

// Only start server if not in Vercel
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}