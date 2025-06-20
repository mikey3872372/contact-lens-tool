const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create lens_brands table
    db.run(`
      CREATE TABLE IF NOT EXISTS lens_brands (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        practice_id INTEGER,
        brand_name TEXT NOT NULL,
        replacement_schedule TEXT NOT NULL,
        practice_price_per_box REAL NOT NULL,
        competitor_price_per_box REAL NOT NULL,
        new_wearer_rebate REAL DEFAULT 0,
        existing_wearer_rebate REAL DEFAULT 0,
        boxes_per_annual INTEGER NOT NULL,
        FOREIGN KEY (practice_id) REFERENCES practices (id)
      )
    `);
  });
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

// Lens Brand Management Routes

// Get all lens brands for a practice
app.get('/api/lens-brands', authenticateToken, (req, res) => {
  db.all(
    'SELECT * FROM lens_brands WHERE practice_id = ? ORDER BY brand_name',
    [req.user.id],
    (err, brands) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(brands);
    }
  );
});

// Add a new lens brand
app.post('/api/lens-brands', authenticateToken, (req, res) => {
  const {
    brand_name,
    replacement_schedule,
    practice_price_per_box,
    competitor_price_per_box,
    new_wearer_rebate,
    existing_wearer_rebate
  } = req.body;

  if (!brand_name || !replacement_schedule || !practice_price_per_box || !competitor_price_per_box) {
    return res.status(400).json({ error: 'All required fields must be provided' });
  }

  // Calculate boxes per annual supply based on replacement schedule
  const boxesPerAnnual = {
    'daily': 12,      // 30 lenses per box, 360 per year
    'weekly': 9,      // 6 lenses per box, 52 per year
    'biweekly': 4,    // 6 lenses per box, 26 per year  
    'monthly': 4      // 3-6 lenses per box, 12 per year
  };

  const boxes_per_annual = boxesPerAnnual[replacement_schedule] || 4;

  db.run(
    `INSERT INTO lens_brands 
     (practice_id, brand_name, replacement_schedule, practice_price_per_box, 
      competitor_price_per_box, new_wearer_rebate, existing_wearer_rebate, boxes_per_annual) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      req.user.id,
      brand_name,
      replacement_schedule,
      practice_price_per_box,
      competitor_price_per_box,
      new_wearer_rebate || 0,
      existing_wearer_rebate || 0,
      boxes_per_annual
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.status(201).json({
        message: 'Lens brand added successfully',
        id: this.lastID
      });
    }
  );
});

// Update a lens brand
app.put('/api/lens-brands/:id', authenticateToken, (req, res) => {
  const {
    brand_name,
    replacement_schedule,
    practice_price_per_box,
    competitor_price_per_box,
    new_wearer_rebate,
    existing_wearer_rebate
  } = req.body;

  const boxesPerAnnual = {
    'daily': 12,
    'weekly': 9,
    'biweekly': 4,
    'monthly': 4
  };

  const boxes_per_annual = boxesPerAnnual[replacement_schedule] || 4;

  db.run(
    `UPDATE lens_brands 
     SET brand_name = ?, replacement_schedule = ?, practice_price_per_box = ?, 
         competitor_price_per_box = ?, new_wearer_rebate = ?, existing_wearer_rebate = ?,
         boxes_per_annual = ?
     WHERE id = ? AND practice_id = ?`,
    [
      brand_name,
      replacement_schedule,
      practice_price_per_box,
      competitor_price_per_box,
      new_wearer_rebate || 0,
      existing_wearer_rebate || 0,
      boxes_per_annual,
      req.params.id,
      req.user.id
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Lens brand not found' });
      }
      res.json({ message: 'Lens brand updated successfully' });
    }
  );
});

// Delete a lens brand
app.delete('/api/lens-brands/:id', authenticateToken, (req, res) => {
  db.run(
    'DELETE FROM lens_brands WHERE id = ? AND practice_id = ?',
    [req.params.id, req.user.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Lens brand not found' });
      }
      res.json({ message: 'Lens brand deleted successfully' });
    }
  );
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});