const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose'); // ✅ added mongoose

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = 'your-government-secret-key-change-in-production';

const damagesRouter = require('./apis/damages'); // Import damages router

// ====== MongoDB Atlas Connection ======

// ====== User Schema ======
const userSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  password: String, // hashed
  name: String,
  role: String,
  department: String,
});

const User = mongoose.model("User", userSchema);

// ====== Middleware ======
app.use(express.json());
const corsOptions = {
  origin: "http://localhost:3000", // React dev server
  methods: "GET,POST,PUT,DELETE,OPTIONS",
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
};
app.use(cors(corsOptions));

app.use('/api/damages', damagesRouter); // Use damages routes under /api

// ====== Auth Middleware ======
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Access token required' });
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

// ====== Routes ======

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Government Portal API is running',
    timestamp: new Date().toISOString()
  });
});

const seedDefaultUsers = async () => {
  try {
    const existingAdmin = await User.findOne({ username: "admin" });
    const existingOfficer = await User.findOne({ username: "officer" });
    
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash("government123", 10);
      await User.create({
        username: "admin",
        password: hashedPassword,
        name: "Administrator",
        role: "admin",
        department: "System Administration"
      });
      console.log("✅ Admin user seeded");
    }
    
    if (!existingOfficer) {
      const hashedPassword = await bcrypt.hash("officer456", 10);
      await User.create({
        username: "officer",
        password: hashedPassword,
        name: "John Officer",
        role: "officer",
        department: "Public Services"
      });
      console.log("✅ Officer user seeded");
    }
  } catch (error) {
    console.error("❌ Error seeding users:", error);
  }
};

// Register endpoint (to create users in DB)
app.post('/api/register', async (req, res) => {
  try {
    const { username, password, name, role, department } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ message: "Username and password required" });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const newUser = new User({
      username,
      password: hashedPassword,
      name,
      role,
      department,
    });
    
    await newUser.save();
    res.status(201).json({ message: "User registered successfully" });
    
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }
    
    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return res.status(401).json({ message: 'Invalid credentials' });
    
    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    const { password: userPassword, ...userWithoutPassword } = user.toObject();
    
    res.json({
      message: 'Login successful',
      token,
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get current user
app.get('/api/user', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ user });
  } catch (error) {
    console.error("User fetch error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Example protected endpoint
app.get('/api/dashboard/stats', authenticateToken, (req, res) => {
  res.json({
    totalUsers: 1247,
    activeServices: 23,
    pendingRequests: 156,
    systemHealth: "Operational",
    lastUpdated: new Date().toISOString(),
  });
});

const MONGO_URI = "mongodb+srv://ronakparmar2428_db_user:PfKF5RJAWNiGcLZf@staticdetection.z53q1az.mongodb.net/?retryWrites=true&w=majority&appName=StaticDetection";

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(async () => {console.log("✅ Connected to MongoDB Atlas");
await seedDefaultUsers(); // Seed default users if not present
})

.catch(err => {
  console.error("❌ MongoDB connection error:", err);
  process.exit(1);
});
// ====== Start Server ======
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔐 Login endpoint: http://localhost:${PORT}/api/login`);
});
