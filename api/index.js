const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool, initializeDatabase, getCurrentQuarter } = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Export for Vercel
module.exports = app;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://contact-lens-tool.vercel.app', 'https://contact-lens-tool-*.vercel.app']
    : ['http://localhost:3000'],
  credentials: true
}));
app.use(express.json());

// Add error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Initialize database on first request
let dbInitialized = false;
async function ensureDB() {
  if (!dbInitialized) {
    await initializeDatabase();
    dbInitialized = true;
  }
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
app.get('/api/health', async (req, res) => {
  try {
    const response = { 
      status: 'Server is running!', 
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
      database: 'Not connected'
    };

    // Try database connection
    try {
      await ensureDB();
      response.database = 'PostgreSQL Connected';
    } catch (dbError) {
      console.error('Health check - DB error:', dbError.message);
      response.database = `Error: ${dbError.message}`;
    }

    res.json(response);
  } catch (error) {
    res.status(500).json({ 
      status: 'Server error',
      error: error.message 
    });
  }
});

// Root route for testing
app.get('/', (req, res) => {
  res.json({ message: 'Contact Lens Tool API is running with PostgreSQL' });
});

// User registration
app.post('/api/register', async (req, res) => {
  try {
    await ensureDB();
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await pool.query(
      'INSERT INTO practices (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email',
      [name, email, hashedPassword]
    );
    
    const practice = result.rows[0];
    const token = jwt.sign({ id: practice.id, email: practice.email }, JWT_SECRET);
    
    res.status(201).json({
      message: 'Practice registered successfully',
      token,
      practice
    });
  } catch (error) {
    if (error.code === '23505') { // Unique constraint violation
      return res.status(400).json({ error: 'Email already exists' });
    }
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// User login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
  
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Special case for master admin - hardcoded bypass (no DB needed)
    if (email === 'admin@contactlenstool.com' && password === 'masteradmin123') {
      const token = jwt.sign({ id: 1, email: email }, JWT_SECRET);
      return res.json({
        message: 'Login successful',
        token,
        practice: { id: 1, name: 'Master Admin', email: email }
      });
    }

    // For other users, try database
    try {
      await ensureDB();
    } catch (dbError) {
      console.error('Database connection error:', dbError);
      return res.status(500).json({ error: 'Database connection failed. Please try again later.' });
    }

    const result = await pool.query('SELECT * FROM practices WHERE email = $1', [email]);
    const practice = result.rows[0];
    
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
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Protected routes
app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, email FROM practices WHERE id = $1', [req.user.id]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// ============================================
// MASTER ADMIN ROUTES (Global Brand Management)
// ============================================

// Get all global brands (master admin only)
app.get('/api/admin/global-brands', authenticateToken, async (req, res) => {
  try {
    await ensureDB();
    
    // Check if user is master admin (hardcoded check for demo)
    if (req.user.email === 'admin@contactlenstool.com') {
      const result = await pool.query('SELECT * FROM global_lens_brands ORDER BY brand_name');
      res.json(result.rows);
    } else {
      return res.status(403).json({ error: 'Access denied. Master admin only.' });
    }
  } catch (error) {
    console.error('Global brands error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add/Update global brand (master admin only)
app.post('/api/admin/global-brands', authenticateToken, async (req, res) => {
  try {
    await ensureDB();
    
    const {
      brand_name,
      boxes_per_annual,
      competitor_price_per_box,
      competitor_annual_rebate,
      competitor_semiannual_rebate,
      competitor_first_time_discount_percent
    } = req.body;

    // Check if user is master admin (hardcoded check for demo)
    if (req.user.email !== 'admin@contactlenstool.com') {
      return res.status(403).json({ error: 'Access denied. Master admin only.' });
    }

    if (!brand_name || !boxes_per_annual) {
      return res.status(400).json({ error: 'Brand name and boxes per year are required' });
    }

    // Check if we're updating an existing brand (if ID is provided)
    const id = req.body.id;
    
    if (id) {
      // Update existing brand
      await pool.query(`
        UPDATE global_lens_brands 
        SET brand_name = $1, boxes_per_annual = $2, competitor_price_per_box = $3, 
            competitor_annual_rebate = $4, competitor_semiannual_rebate = $5, 
            competitor_first_time_discount_percent = $6
        WHERE id = $7
      `, [
        brand_name,
        parseInt(boxes_per_annual),
        parseFloat(competitor_price_per_box) || 0,
        parseFloat(competitor_annual_rebate) || 0,
        parseFloat(competitor_semiannual_rebate) || 0,
        parseFloat(competitor_first_time_discount_percent) || 0,
        id
      ]);
      res.json({ message: 'Global brand updated successfully', id: id });
    } else {
      // Insert new brand
      const result = await pool.query(`
        INSERT INTO global_lens_brands 
        (brand_name, boxes_per_annual, competitor_price_per_box, competitor_annual_rebate, 
         competitor_semiannual_rebate, competitor_first_time_discount_percent) 
        VALUES ($1, $2, $3, $4, $5, $6) RETURNING id
      `, [
        brand_name,
        parseInt(boxes_per_annual),
        parseFloat(competitor_price_per_box) || 0,
        parseFloat(competitor_annual_rebate) || 0,
        parseFloat(competitor_semiannual_rebate) || 0,
        parseFloat(competitor_first_time_discount_percent) || 0
      ]);
      res.json({ message: 'Global brand created successfully', id: result.rows[0].id });
    }
  } catch (error) {
    console.error('Global brand creation error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// PRACTICE ROUTES (Practice-Specific Management)
// ============================================

// Get available brands for practice pricing setup
app.get('/api/available-brands', authenticateToken, async (req, res) => {
  try {
    await ensureDB();
    const result = await pool.query(`
      SELECT 
        gb.*,
        pp.practice_price_per_box,
        pp.practice_manufacturer_rebate_new,
        pp.practice_manufacturer_rebate_existing,
        pp.is_active as practice_active
      FROM global_lens_brands gb
      LEFT JOIN practice_pricing pp ON gb.id = pp.global_brand_id AND pp.practice_id = $1
      WHERE gb.is_active = TRUE
      ORDER BY gb.brand_name
    `, [req.user.id]);
    res.json(result.rows);
  } catch (error) {
    console.error('Available brands error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update practice pricing for a brand
app.post('/api/practice-pricing', authenticateToken, async (req, res) => {
  try {
    await ensureDB();
    
    const { 
      global_brand_id, 
      practice_price_per_box,
      practice_manufacturer_rebate_new,
      practice_manufacturer_rebate_existing
    } = req.body;

    if (!global_brand_id) {
      return res.status(400).json({ error: 'Brand ID is required' });
    }

    // Check if record exists first
    const existing = await pool.query(`
      SELECT id FROM practice_pricing 
      WHERE practice_id = $1 AND global_brand_id = $2
    `, [req.user.id, global_brand_id]);

    if (existing.rows.length > 0) {
      // Update existing record
      await pool.query(`
        UPDATE practice_pricing 
        SET practice_price_per_box = $1, practice_manufacturer_rebate_new = $2, 
            practice_manufacturer_rebate_existing = $3, created_at = CURRENT_TIMESTAMP
        WHERE practice_id = $4 AND global_brand_id = $5
      `, [
        practice_price_per_box || 0,
        practice_manufacturer_rebate_new || 0,
        practice_manufacturer_rebate_existing || 0,
        req.user.id, 
        global_brand_id
      ]);
      res.json({ message: 'Practice data updated successfully' });
    } else {
      // Create new record
      await pool.query(`
        INSERT INTO practice_pricing 
        (practice_id, global_brand_id, practice_price_per_box, practice_manufacturer_rebate_new, 
         practice_manufacturer_rebate_existing, is_active) 
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        req.user.id, 
        global_brand_id, 
        practice_price_per_box || 0,
        practice_manufacturer_rebate_new || 0,
        practice_manufacturer_rebate_existing || 0,
        true
      ]);
      res.json({ message: 'Practice data created successfully' });
    }
  } catch (error) {
    console.error('Practice pricing error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get practice settings (quarterly rebates)
app.get('/api/practice-settings', authenticateToken, async (req, res) => {
  try {
    await ensureDB();
    const result = await pool.query(`
      SELECT 
        new_wearer_rebate_q1, new_wearer_rebate_q2, new_wearer_rebate_q3, new_wearer_rebate_q4,
        existing_wearer_rebate_q1, existing_wearer_rebate_q2, existing_wearer_rebate_q3, existing_wearer_rebate_q4
      FROM practices 
      WHERE id = $1
    `, [req.user.id]);
    res.json(result.rows[0] || {});
  } catch (error) {
    console.error('Practice settings error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update practice settings (quarterly rebates)
app.post('/api/practice-settings', authenticateToken, async (req, res) => {
  try {
    await ensureDB();
    const {
      new_wearer_rebate_q1, new_wearer_rebate_q2, new_wearer_rebate_q3, new_wearer_rebate_q4,
      existing_wearer_rebate_q1, existing_wearer_rebate_q2, existing_wearer_rebate_q3, existing_wearer_rebate_q4
    } = req.body;

    await pool.query(`
      UPDATE practices 
      SET new_wearer_rebate_q1 = $1, new_wearer_rebate_q2 = $2, new_wearer_rebate_q3 = $3, new_wearer_rebate_q4 = $4,
          existing_wearer_rebate_q1 = $5, existing_wearer_rebate_q2 = $6, existing_wearer_rebate_q3 = $7, existing_wearer_rebate_q4 = $8
      WHERE id = $9
    `, [
      new_wearer_rebate_q1 || 0, new_wearer_rebate_q2 || 0, new_wearer_rebate_q3 || 0, new_wearer_rebate_q4 || 0,
      existing_wearer_rebate_q1 || 0, existing_wearer_rebate_q2 || 0, existing_wearer_rebate_q3 || 0, existing_wearer_rebate_q4 || 0,
      req.user.id
    ]);
    res.json({ message: 'Practice settings updated successfully' });
  } catch (error) {
    console.error('Practice settings update error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// PRICE COMPARISON ROUTES
// ============================================

// Get brands available for comparison (practice has pricing set)
app.get('/api/comparison-brands', authenticateToken, async (req, res) => {
  try {
    await ensureDB();
    const result = await pool.query(`
      SELECT 
        gb.id, gb.brand_name, gb.boxes_per_annual, gb.competitor_price_per_box,
        gb.competitor_annual_rebate, gb.competitor_semiannual_rebate, gb.competitor_first_time_discount_percent,
        pp.practice_price_per_box, pp.practice_manufacturer_rebate_new, pp.practice_manufacturer_rebate_existing
      FROM global_lens_brands gb
      INNER JOIN practice_pricing pp ON gb.id = pp.global_brand_id 
      WHERE pp.practice_id = $1 AND pp.is_active = TRUE AND gb.is_active = TRUE
      ORDER BY gb.brand_name
    `, [req.user.id]);
    res.json(result.rows);
  } catch (error) {
    console.error('Comparison brands error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Calculate price comparison
app.post('/api/calculate-comparison', authenticateToken, async (req, res) => {
  try {
    await ensureDB();
    const { global_brand_id, insurance_benefit, is_new_wearer } = req.body;

    if (!global_brand_id) {
      return res.status(400).json({ error: 'Brand ID is required' });
    }

    // Get brand and pricing data
    const result = await pool.query(`
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
      WHERE gb.id = $1 AND pp.practice_id = $2
    `, [global_brand_id, req.user.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Brand not found or no pricing set' });
    }

    const data = result.rows[0];
    const currentQuarter = getCurrentQuarter();
    
    // Get practice rebate for current quarter
    const practiceRebateNew = data[`new_wearer_rebate_${currentQuarter}`] || 0;
    const practiceRebateExisting = data[`existing_wearer_rebate_${currentQuarter}`] || 0;
    const practiceRebate = is_new_wearer ? practiceRebateNew : practiceRebateExisting;

    // Get manufacturer rebate
    const manufacturerRebate = is_new_wearer ? 
      (data.practice_manufacturer_rebate_new || 0) : 
      (data.practice_manufacturer_rebate_existing || 0);

    // Calculate totals
    const practiceSubtotal = parseFloat(data.practice_price_per_box) * data.boxes_per_annual;
    const competitorSubtotal = parseFloat(data.competitor_price_per_box || 0) * data.boxes_per_annual;
    
    const insuranceBenefit = insurance_benefit || 0;
    
    // Practice pricing calculations
    const practiceInOfficeToday = Math.max(0, practiceSubtotal - insuranceBenefit);
    const practiceAfterAllRebates = Math.max(0, practiceInOfficeToday - parseFloat(manufacturerRebate));
    
    // Competitor calculations
    const competitorAnnualRebate = parseFloat(data.competitor_annual_rebate) || 0;
    const competitorFinalAmount = Math.max(0, competitorSubtotal - competitorAnnualRebate);
    
    // Calculate savings
    const totalSavings = competitorFinalAmount - practiceAfterAllRebates;
    
    const comparison = {
      brand: {
        id: data.id,
        name: data.brand_name,
        boxes_per_annual: data.boxes_per_annual
      },
      practice: {
        price_per_box: parseFloat(data.practice_price_per_box),
        subtotal: practiceSubtotal,
        practice_rebate: parseFloat(practiceRebate),
        manufacturer_rebate: parseFloat(manufacturerRebate),
        insurance_applied: insuranceBenefit,
        in_office_today: practiceInOfficeToday,
        final_amount_after_rebates: practiceAfterAllRebates
      },
      competitor: {
        name: "1-800 Contacts",
        price_per_box: parseFloat(data.competitor_price_per_box) || 0,
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
  } catch (error) {
    console.error('Price comparison error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Don't start server in Vercel - it's handled by the platform