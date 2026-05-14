# 🚀 Deemona Dashboard API

Complete REST API for the Deemona Finance Dashboard with **127 tables** across **33 modules**.

---

## 📦 **Features**

✅ **Full CRUD Operations** for all 127 tables  
✅ **JWT Authentication** & Authorization  
✅ **Multi-tenant Architecture** with data isolation  
✅ **Pagination, Sorting & Filtering**  
✅ **Search across all entities**  
✅ **Rate Limiting** & Security headers  
✅ **Input Validation** with Joi  
✅ **Error Handling** with detailed logging  
✅ **TypeScript** for type safety  
✅ **PostgreSQL** connection pooling  

---

## 🏗️ **Architecture**

```
src/
├── config/          # Database & app configuration
├── controllers/     # Request handlers
├── middleware/      # Auth, validation, error handling
├── models/          # TypeScript interfaces
├── routes/          # API route definitions (133+ files)
├── services/        # Business logic
├── types/           # Type definitions
└── utils/           # Helper functions
```

---

## 🚀 **Quick Start**

### **1. Prerequisites**

- Node.js >= 18.0.0
- PostgreSQL 12+
- npm >= 9.0.0

### **2. Installation**

```bash
# Clone the repository
cd deemona-api

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your database credentials
nano .env
```

### **3. Configure Database**

Edit `.env` file:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=deemona_dashboard
DB_USER=postgres
DB_PASSWORD=your_password_here
DB_SSL=false

JWT_SECRET=your_super_secret_key_change_in_production
```

### **4. Run the API**

```bash
# Development mode (with hot reload)
npm run dev

# Production build
npm run build
npm start
```

The API will start at: **http://localhost:3000**

---

## 📡 **API Endpoints**

### **Base URL**
```
http://localhost:3000/api/v1
```

### **Health Check**
```
GET /health
```

### **Authentication**
```
POST /api/v1/auth/login          # User login
POST /api/v1/auth/register       # User registration
POST /api/v1/auth/refresh        # Refresh JWT token
GET  /api/v1/auth/me             # Get current user
```

### **Module Endpoints**

#### **User Management**
```
GET    /api/v1/users             # List users (paginated)
GET    /api/v1/users/search      # Search users
GET    /api/v1/users/:id         # Get user by ID
POST   /api/v1/users             # Create user
PUT    /api/v1/users/:id         # Update user
DELETE /api/v1/users/:id         # Delete user

GET    /api/v1/tenants           # List tenants
GET    /api/v1/roles             # List roles
GET    /api/v1/roles/:id/permissions  # Get role permissions
```

#### **Reports**
```
GET    /api/v1/reports/master    # List all reports
GET    /api/v1/reports/data      # Report data snapshots
GET    /api/v1/reports/kpis      # KPI metrics
GET    /api/v1/reports/run-history  # Execution history
GET    /api/v1/reports/approvals # Report approvals
```

#### **Dashboards**
```
GET    /api/v1/dashboards        # List dashboards
POST   /api/v1/dashboards        # Create dashboard
GET    /api/v1/dashboards/widgets  # Dashboard widgets
```

#### **Data Integration**
```
GET    /api/v1/data-sources      # List data sources
POST   /api/v1/data-sources/uploads  # Upload data
GET    /api/v1/data-sources/etl-jobs  # ETL job status
```

#### **AI & Analytics**
```
GET    /api/v1/ai-analytics/forecast-models  # ML models
GET    /api/v1/ai-analytics/insights  # AI insights
GET    /api/v1/ai-analytics/recommendations  # Recommendations
GET    /api/v1/ai-analytics/anomalies  # Anomaly detection
```

#### **Compliance**
```
GET    /api/v1/compliance/rules  # Compliance rules
GET    /api/v1/compliance/calendar  # Compliance calendar
GET    /api/v1/compliance/submissions  # Submissions
GET    /api/v1/compliance/audit  # Audit trail
```

#### **Automation**
```
GET    /api/v1/automation        # Scheduled tasks
GET    /api/v1/workflows         # Workflow definitions
GET    /api/v1/alerts            # Alert rules
```

#### **Chatbot**
```
POST   /api/v1/chatbot/sessions  # Start chat session
POST   /api/v1/chatbot/queries   # Send query
GET    /api/v1/chatbot/responses  # Get responses
```

#### **Billing**
```
GET    /api/v1/billing/accounts  # Billing accounts
GET    /api/v1/billing/usage     # Usage metrics
```

#### **Admin**
```
GET    /api/v1/admin             # System settings
GET    /api/v1/audit             # Audit logs
```

---

## 🔐 **Authentication**

### **Login**

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "user": {
      "userId": 1,
      "tenantId": 1,
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "Admin"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "24h"
  }
}
```

### **Using the Token**

Include the JWT token in all authenticated requests:

```bash
curl -X GET http://localhost:3000/api/v1/users \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 📊 **Pagination**

All `GET` endpoints support pagination:

```bash
GET /api/v1/users?page=1&limit=20&sortBy=created_at&sortOrder=desc
```

**Parameters:**
- `page` (default: 1)
- `limit` (default: 20, max: 100)
- `sortBy` (column name)
- `sortOrder` (asc | desc)

**Response:**
```json
{
  "status": "success",
  "data": [ ...items... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

---

## 🔍 **Search**

Search across multiple fields:

```bash
GET /api/v1/users/search?q=john&fields=first_name,last_name,email
```

**Parameters:**
- `q` - Search term
- `fields` - Comma-separated list of fields to search

---

## 🛡️ **Security**

### **Helmet.js**
Security headers automatically applied

### **CORS**
Configured for specific origins

### **Rate Limiting**
- 100 requests per 15 minutes per IP
- Configurable in `.env`

### **Input Validation**
All inputs validated with Joi schemas

### **SQL Injection Protection**
Parameterized queries with pg library

---

## 📁 **Complete API Structure**

### **All 127 Tables Available via REST API**

| Module | Tables | Endpoints |
|--------|--------|-----------|
| User Management | 10 | `/users`, `/roles`, `/permissions`, `/sessions`, etc. |
| Reports | 15 | `/reports/*` |
| Dashboards | 2 | `/dashboards`, `/dashboards/widgets` |
| Data Integration | 9 | `/data-sources/*` |
| AI & Analytics | 10 | `/ai-analytics/*` |
| Compliance | 7 | `/compliance/*` |
| Automation | 7 | Various automation endpoints |
| Chatbot | 5 | `/chatbot/*` |
| Billing | 2 | `/billing/*` |
| + 24 more modules | 60+ | See route files |

---

## 🧪 **Testing**

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage
```

---

## 📝 **Example Requests**

### **Create a New User**

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": 1,
    "first_name": "Jane",
    "last_name": "Doe",
    "email": "jane@example.com",
    "password": "securePassword123",
    "role_id": 2
  }'
```

### **Get All Reports**

```bash
curl -X GET http://localhost:3000/api/v1/reports/master \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### **Create a Dashboard**

```bash
curl -X POST http://localhost:3000/api/v1/dashboards \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "dashboard_name": "Executive Dashboard",
    "description": "KPIs for executives",
    "layout_config": {},
    "is_public": false
  }'
```

---

## 🔧 **Development**

### **Project Scripts**

```bash
npm run dev      # Development with hot reload
npm run build    # Build TypeScript to JavaScript
npm start        # Run production build
npm run lint     # Lint code
npm run format   # Format code with Prettier
```

### **Generate Routes**

To regenerate routes for all tables:

```bash
node scripts/generateRoutes.js
```

---

## 🌍 **Environment Variables**

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment | development |
| `PORT` | Server port | 3000 |
| `DB_HOST` | Database host | localhost |
| `DB_PORT` | Database port | 5432 |
| `DB_NAME` | Database name | deemona_dashboard |
| `DB_USER` | Database user | postgres |
| `DB_PASSWORD` | Database password | - |
| `JWT_SECRET` | JWT secret key | - |
| `JWT_EXPIRES_IN` | Token expiry | 24h |
| `CORS_ORIGIN` | Allowed origin | * |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests | 100 |

---

## 📊 **Response Format**

### **Success Response**

```json
{
  "status": "success",
  "data": { ...data... },
  "pagination": { ...pagination info... }
}
```

### **Error Response**

```json
{
  "status": "error",
  "statusCode": 400,
  "message": "Validation error: email is required"
}
```

---

## 🐛 **Troubleshooting**

### **Database Connection Failed**

```bash
# Check PostgreSQL is running
pg_isready

# Test connection manually
psql -h localhost -U postgres -d deemona_dashboard
```

### **Port Already in Use**

```bash
# Change PORT in .env file
PORT=3001
```

### **JWT Token Invalid**

- Check `JWT_SECRET` in `.env`
- Ensure token hasn't expired
- Verify Authorization header format: `Bearer TOKEN`

---

## 📚 **Documentation**

- [Database Schema](../schema.sql)
- [ERD Diagram](../ERD_DOCUMENTATION.md)
- [Triggers & Views](../TRIGGERS_AND_VIEWS_GUIDE.md)

---

## 🤝 **Contributing**

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 **License**

ISC License

---

## 👥 **Team**

**Deemona Development Team**

---

## 🎉 **You're All Set!**

Your complete REST API for all 127 tables is ready to use!

```bash
npm run dev
```

Visit: **http://localhost:3000/health**

---

*API Version: 1.0.0*  
*Last Updated: 2026-05-02*
