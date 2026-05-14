import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import pool from '../config/database';

const router = express.Router();

// Database setup endpoint
router.get('/run', async (req: Request, res: Response) => {
  try {
    console.log('🔧 Starting database setup...');

    // Read full schema SQL
    const schemaSQL = fs.readFileSync(
      path.join(__dirname, '../../full_schema.sql'),
      'utf8'
    );

    // Run schema SQL
    console.log('📦 Creating all tables...');
    await pool.query(schemaSQL);
    console.log('✅ All tables created!');

    // Verify tables
    const result = await pool.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename;
    `);

    res.json({
      success: true,
      message: 'Database setup completed successfully!',
      tables: result.rows.map(r => r.tablename),
      totalTables: result.rows.length
    });

  } catch (error: any) {
    console.error('❌ Database setup failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

export default router;