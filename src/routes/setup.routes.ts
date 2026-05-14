import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import pool from '../config/database';

const router = express.Router();

// Database setup endpoint
router.get('/run', async (req: Request, res: Response) => {
  try {
    console.log('🔧 Starting database setup...');

    // Read minimal_setup.sql
    const setupSQL = fs.readFileSync(
      path.join(__dirname, '../../minimal_setup.sql'),
      'utf8'
    );

    // Read seed-final-fixed.sql
    const seedSQL = fs.readFileSync(
      path.join(__dirname, '../../seed-final-fixed.sql'),
      'utf8'
    );

    // Run setup SQL
    console.log('📦 Creating tables...');
    await pool.query(setupSQL);
    console.log('✅ Tables created!');

    // Run seed SQL
    console.log('🌱 Seeding data...');
    await pool.query(seedSQL);
    console.log('✅ Data seeded!');

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