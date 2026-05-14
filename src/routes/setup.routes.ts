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
      path.join(__dirname, '../../essential_schema.sql'),
      'utf8'
    );

    // Split by semicolons and execute one by one
    const statements = schemaSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.match(/^SET/i));

    console.log(`📦 Found ${statements.length} SQL statements to execute...`);

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < statements.length; i++) {
      try {
        // Skip empty or comment-only statements
        if (statements[i].trim().length === 0) continue;
        
        await pool.query(statements[i] + ';');
        successCount++;
        
        if ((i + 1) % 20 === 0) {
          console.log(`✅ Progress: ${i + 1}/${statements.length}`);
        }
      } catch (error: any) {
        errorCount++;
        errors.push(`Statement ${i + 1}: ${error.message.substring(0, 100)}`);
        console.error(`⚠️ Skipped statement ${i + 1}:`, error.message.substring(0, 100));
        // Continue with next statement
      }
    }

    console.log(`✅ Setup complete! Success: ${successCount}, Errors: ${errorCount}`);

    // Verify tables
    const result = await pool.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename;
    `);

    res.json({
      success: true,
      message: 'Database setup completed!',
      tables: result.rows.map(r => r.tablename),
      totalTables: result.rows.length,
      totalStatements: statements.length,
      successfulStatements: successCount,
      failedStatements: errorCount,
      sampleErrors: errors.slice(0, 5)
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