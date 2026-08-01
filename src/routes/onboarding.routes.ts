import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { getTenantDB } from '../config/tenantDb';
import pool from '../config/database';

const router = Router();
router.use(authenticate);

// ??????????????????????????????????????????????????????????????????????????
// ONBOARDING WIZARD ? 6 steps to get a new tenant productive
// Step 1: Company profile (name, GSTIN, address, industry)
// Step 2: Select modules (which of 23 modules they need)
// Step 3: Add employees (bulk or one by one)
// Step 4: Set up departments and budgets
// Step 5: Import existing data (Tally XML or manual)
// Step 6: Complete and launch dashboard
// ??????????????????????????????????????????????????????????????????????????

// Get onboarding status
router.get('/status', async (req: Request, res: Response) => {
  try {
    const db = getTenantDB(req);
    const userId = (req as any).user?.userId;

    const [progress, tenant, empCount, moduleCount] = await Promise.all([
      pool.query('SELECT * FROM onboarding_progress WHERE user_id=$1 ORDER BY id DESC LIMIT 1', [userId]),
      pool.query('SELECT * FROM tenants WHERE tenant_id=$1', [db.id]),
      pool.query('SELECT COUNT(*) as c FROM employees WHERE tenant_id=$1', [db.id]),
      pool.query('SELECT COUNT(*) as c FROM user_workspace WHERE user_id=$1', [userId])
    ]);

    const currentStep = progress.rows[0]?.step || 0;
    const isComplete = progress.rows[0]?.completed || false;

    res.json({
      status: 'success',
      data: {
        current_step: currentStep,
        is_complete: isComplete,
        steps: [
          { step: 1, title: 'Company Profile', description: 'Set up your company details', completed: currentStep > 1 },
          { step: 2, title: 'Select Modules', description: 'Choose which modules you need', completed: currentStep > 2 },
          { step: 3, title: 'Add Team', description: 'Add your employees', completed: currentStep > 3, count: parseInt(empCount.rows[0].c) },
          { step: 4, title: 'Departments & Budgets', description: 'Set up departments and allocate budgets', completed: currentStep > 4 },
          { step: 5, title: 'Import Data', description: 'Import from Tally or add sample data', completed: currentStep > 5 },
          { step: 6, title: 'Launch', description: 'You are ready to go!', completed: isComplete }
        ],
        company: tenant.rows[0] || {},
        progress_data: progress.rows[0]?.data || {}
      }
    });
  } catch (e: any) { res.status(500).json({ status: 'error', message: e.message }); }
});

// Step 1: Save company profile
router.post('/step/1', async (req: Request, res: Response) => {
  try {
    const db = getTenantDB(req);
    const userId = (req as any).user?.userId;
    const { company_name, gstin, industry, address, city, state, pincode, phone, website } = req.body;

    // Update tenant details
    await pool.query(
      'UPDATE tenants SET tenant_name=$1, updated_at=NOW() WHERE tenant_id=$2',
      [company_name, db.id]
    );

    // Save GSTIN if provided
    if (gstin) {
      await pool.query(
        'INSERT INTO tenant_settings (tenant_id,setting_key,setting_value) VALUES ($1,$2,$3) ON CONFLICT (tenant_id,setting_key) DO UPDATE SET setting_value=$3',
        [db.id, 'gstin', gstin]
      );
    }

    // Save other settings
    const settings = { industry, address, city, state, pincode, phone, website };
    for (const [key, value] of Object.entries(settings)) {
      if (value) {
        await pool.query(
          'INSERT INTO tenant_settings (tenant_id,setting_key,setting_value) VALUES ($1,$2,$3) ON CONFLICT (tenant_id,setting_key) DO UPDATE SET setting_value=$3',
          [db.id, key, value]
        );
      }
    }

    await saveProgress(userId, 2, { company_profile: req.body });
    res.json({ status: 'success', message: 'Company profile saved', next_step: 2 });
  } catch (e: any) { res.status(500).json({ status: 'error', message: e.message }); }
});

// Step 2: Select modules
router.post('/step/2', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    const { selected_modules, selected_domains } = req.body;

    // Save workspace preferences
    await pool.query(
      'INSERT INTO user_workspace (user_id, selected_modules, selected_domains) VALUES ($1,$2,$3) ON CONFLICT (user_id) DO UPDATE SET selected_modules=$2, selected_domains=$3',
      [userId, JSON.stringify(selected_modules||[]), JSON.stringify(selected_domains||[])]
    );

    await saveProgress(userId, 3, { selected_modules, selected_domains });
    res.json({ status: 'success', message: 'Modules selected', next_step: 3 });
  } catch (e: any) { res.status(500).json({ status: 'error', message: e.message }); }
});

// Step 3: Add employees (quick add)
router.post('/step/3', async (req: Request, res: Response) => {
  try {
    const db = getTenantDB(req);
    const userId = (req as any).user?.userId;
    const { employees } = req.body; // array of {name, email, department, designation, salary}

    let added = 0;
    for (const emp of (employees||[])) {
      const [first, ...rest] = (emp.name || '').split(' ');
      const last = rest.join(' ') || first;
      const empCount = await pool.query('SELECT COUNT(*) as c FROM employees WHERE tenant_id=$1', [db.id]);
      const empCode = 'EMP' + String(parseInt(empCount.rows[0].c)+1).padStart(4,'0');
      await pool.query(
        'INSERT INTO employees (tenant_id,employee_code,first_name,last_name,email,department,designation,basic_salary,employment_type,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT DO NOTHING',
        [db.id, empCode, first, last, emp.email||'', emp.department||'General', emp.designation||'Employee', emp.salary||0, 'Full-time', 'Active']
      );
      added++;
    }

    await saveProgress(userId, 4, { employees_added: added });
    res.json({ status: 'success', message: added + ' employees added', next_step: 4 });
  } catch (e: any) { res.status(500).json({ status: 'error', message: e.message }); }
});

// Step 4: Set up departments and budgets
router.post('/step/4', async (req: Request, res: Response) => {
  try {
    const db = getTenantDB(req);
    const userId = (req as any).user?.userId;
    const { departments } = req.body; // array of {name, budget}

    let created = 0;
    const year = new Date().getFullYear();
    for (const dept of (departments||[])) {
      await pool.query(
        'INSERT INTO budgets (tenant_id,department,allocated_amount,spent_amount,period,fiscal_year,status) VALUES ($1,$2,$3,0,$4,$5,$6) ON CONFLICT DO NOTHING',
        [db.id, dept.name, dept.budget||0, 'Annual', year, 'Active']
      );
      created++;
    }

    await saveProgress(userId, 5, { departments_created: created });
    res.json({ status: 'success', message: created + ' department budgets created', next_step: 5 });
  } catch (e: any) { res.status(500).json({ status: 'error', message: e.message }); }
});

// Step 5: Import data or add sample data
router.post('/step/5', async (req: Request, res: Response) => {
  try {
    const db = getTenantDB(req);
    const userId = (req as any).user?.userId;
    const { use_sample_data } = req.body;

    if (use_sample_data) {
      // Add sample orders
      const year = new Date().getFullYear();
      const sampleOrders = [
        { customer: 'Tata Consultancy Services', amount: 250000 },
        { customer: 'Infosys Limited', amount: 180000 },
        { customer: 'Wipro Technologies', amount: 320000 },
      ];
      for (let i = 0; i < sampleOrders.length; i++) {
        const o = sampleOrders[i];
        await pool.query(
          'INSERT INTO orders (tenant_id,order_number,customer_name,total_amount,status,payment_status) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING',
          [db.id, 'ORD-'+year+'-000'+( i+1), o.customer, o.amount, 'Delivered', 'Paid']
        );
      }

      // Add sample vendors
      const sampleVendors = ['Amazon Web Services', 'Microsoft India', 'Jio Business'];
      for (const v of sampleVendors) {
        await pool.query(
          'INSERT INTO vendors (tenant_id,vendor_name,category,contact_person,status) VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING',
          [db.id, v, 'Technology', 'Account Manager', 'Active']
        );
      }
    }

    await saveProgress(userId, 6, { sample_data: use_sample_data });
    res.json({ status: 'success', message: use_sample_data ? 'Sample data added' : 'Skipped data import', next_step: 6 });
  } catch (e: any) { res.status(500).json({ status: 'error', message: e.message }); }
});

// Step 6: Complete onboarding
router.post('/step/6', async (req: Request, res: Response) => {
  try {
    const db = getTenantDB(req);
    const userId = (req as any).user?.userId;

    await pool.query(
      'UPDATE onboarding_progress SET completed=true, step=6 WHERE user_id=$1',
      [userId]
    );

    // Send completion email
    const user = await pool.query('SELECT email, first_name FROM users WHERE user_id=$1', [userId]);
    if (user.rows.length) {
      const { emailService } = await import('../services/email.service');
      await emailService.send({
        to: user.rows[0].email,
        subject: 'Welcome to Deemona ERP - Setup Complete!',
        html: '<div style="font-family:Arial,sans-serif"><h2 style="color:#1e3a5f">Congratulations ' + user.rows[0].first_name + '!</h2><p>Your Deemona Enterprise Finance Suite is ready.</p><p><a href="https://finance-frontend-2l6b.onrender.com/dashboard" style="background:#1e3a5f;color:white;padding:12px 24px;text-decoration:none;border-radius:4px;display:inline-block;margin-top:16px;">Go to Dashboard</a></p></div>'
      }).catch(console.error);
    }

    res.json({
      status: 'success',
      message: 'Onboarding complete! Welcome to Deemona ERP.',
      redirect: '/dashboard'
    });
  } catch (e: any) { res.status(500).json({ status: 'error', message: e.message }); }
});

// Skip onboarding
router.post('/skip', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    await saveProgress(userId, 6, { skipped: true });
    await pool.query('UPDATE onboarding_progress SET completed=true WHERE user_id=$1', [userId]);
    res.json({ status: 'success', message: 'Onboarding skipped' });
  } catch (e: any) { res.status(500).json({ status: 'error', message: e.message }); }
});

async function saveProgress(userId: number, step: number, data: any) {
  const existing = await pool.query('SELECT id, data FROM onboarding_progress WHERE user_id=$1', [userId]);
  if (existing.rows.length) {
    const merged = { ...existing.rows[0].data, ...data };
    await pool.query('UPDATE onboarding_progress SET step=$1, data=$2 WHERE user_id=$3', [step, JSON.stringify(merged), userId]);
  } else {
    await pool.query('INSERT INTO onboarding_progress (user_id,step,data) VALUES ($1,$2,$3)', [userId, step, JSON.stringify(data)]);
  }
}

export default router;
