# ⚡ Quick Start Guide - Deemona Dashboard API

Get your API running in **5 minutes**!

---

## 🚀 **Step 1: Navigate to API Directory**

```bash
cd /home/claude/deemona-api
```

---

## 📦 **Step 2: Install Dependencies**

```bash
npm install
```

This will install all required packages (~50 MB).

---

## ⚙️ **Step 3: Configure Environment**

```bash
# Copy the example environment file
cp .env.example .env

# Edit with your settings
nano .env
```

**Minimum required settings:**
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=deemona_dashboard
DB_USER=postgres
DB_PASSWORD=your_actual_password_here
JWT_SECRET=change_this_to_a_random_secret_key
```

---

## 🗄️ **Step 4: Verify Database**

Make sure your PostgreSQL database is running and accessible:

```bash
# Test connection
psql -U postgres -d deemona_dashboard -c "SELECT COUNT(*) FROM tenants;"
```

If this works, you're ready!

---

## 🎬 **Step 5: Start the API**

### **Development Mode** (recommended for testing):
```bash
npm run dev
```

### **Production Mode**:
```bash
npm run build
npm start
```

---

## ✅ **Step 6: Test the API**

### **1. Check Health**
```bash
curl http://localhost:3000/health
```

**Expected Response:**
```json
{
  "status": "success",
  "message": "Deemona Dashboard API is running",
  "version": "v1",
  "timestamp": "2026-05-02T..."
}
```

### **2. Login (use sample data)**
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice.smith@demo.com",
    "password": "password123"
  }'
```

**You'll get a JWT token in response!**

### **3. Make an Authenticated Request**
```bash
# Replace YOUR_TOKEN with the token from step 2
curl -X GET http://localhost:3000/api/v1/users \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🎉 **You're Done!**

Your API is now running and serving all 127 tables!

---

## 📚 **Next Steps**

1. **Explore endpoints** - See `README.md` for all available endpoints
2. **Test with Postman** - Import the API endpoints
3. **Build your frontend** - Connect your React/Vue/Angular app
4. **Customize** - Add custom business logic to controllers/services

---

## 🔧 **Common Commands**

```bash
# Development with hot reload
npm run dev

# Build for production
npm run build

# Run production
npm start

# Run tests
npm test

# Lint code
npm run lint

# Format code
npm run format

# Generate new routes
node scripts/generateRoutes.js
```

---

## 🐛 **Troubleshooting**

### **"Port 3000 is already in use"**
Change the port in `.env`:
```env
PORT=3001
```

### **"Database connection failed"**
Check your `.env` settings and ensure PostgreSQL is running:
```bash
pg_isready
```

### **"Cannot find module"**
Reinstall dependencies:
```bash
rm -rf node_modules
npm install
```

---

## 📊 **API Stats**

```
✅ 127 Database Tables
✅ 133 Route Files
✅ 11 Main Modules
✅ Full CRUD Operations
✅ JWT Authentication
✅ Multi-tenant Support
✅ Input Validation
✅ Error Handling
✅ Rate Limiting
✅ Search & Pagination
```

---

## 🌐 **API Endpoints**

- **Health**: http://localhost:3000/health
- **API Base**: http://localhost:3000/api/v1
- **Login**: http://localhost:3000/api/v1/auth/login
- **Users**: http://localhost:3000/api/v1/users
- **Reports**: http://localhost:3000/api/v1/reports
- **Dashboards**: http://localhost:3000/api/v1/dashboards

**See README.md for complete endpoint list!**

---

**Happy Coding! 🚀**
