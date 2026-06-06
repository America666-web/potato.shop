const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const cors = require('cors');
const session = require('express-session');
const path = require('path');

const app = express();
const db = new sqlite3.Database('./database.db');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));
app.use(session({
  secret: 'secret-key',
  resave: false,
  saveUninitialized: true
}));

// DB init
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  const adminPass = bcrypt.hashSync('4205', 10);
  db.run(`INSERT OR IGNORE INTO users (email, password, role, status) VALUES (?, ?, ?, ?)`,
    ['fortter', adminPass, 'admin', 'active']);
});

// register
app.post('/api/register', async (req, res) => {
  const { email, password } = req.body;
  
  if(!email || !password){
    return res.status(400).json({error: 'Email and password required'});
  }

  const hash = await bcrypt.hash(password, 10);

  db.run(`INSERT INTO users (email, password, status) VALUES (?, ?, ?)`, 
    [email, hash, 'мирный'], 
    function(err){
      if(err){
        if(err.message.includes('UNIQUE constraint failed')){
          return res.status(400).json({error: 'user exists'});
        }
        return res.status(400).json({error: err.message});
      }
      res.json({success: true, message: 'User registered successfully'});
    }
  );
});

// login
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  db.get(`SELECT * FROM users WHERE email = ?`, [email], async (err, user) => {
    if(err) return res.status(500).json({error: 'Server error'});
    if(!user) return res.status(400).json({error: 'no user'});
    
    // Allow active and мирный users to login
    if(user.status !== 'active' && user.status !== 'мирный'){
      return res.status(403).json({error: 'user disabled'});
    }

    const ok = await bcrypt.compare(password, user.password);
    if(!ok) return res.status(400).json({error: 'wrong pass'});

    req.session.user = {
      id: user.id, 
      email: user.email, 
      role: user.role,
      status: user.status
    };
    res.json(req.session.user);
  });
});

// me
app.get('/api/me', (req, res) => {
  res.json(req.session.user || null);
});

// logout
app.post('/api/logout', (req,res)=>{
  req.session.destroy(()=>res.json({ok:true}));
});

app.listen(3000, ()=>console.log('Server running on 3000'));
