import pool from '../config/database';
import { sendWhatsApp } from './automation.service';

// ?? Helper: create in-app notification for all tenant users ????????????????
async function notify(tenantId: number, title: string, message: string, type: string, link: string) {
  try {
    const users = await pool.query('SELECT user_id FROM users WHERE tenant_id=$1 AND status=$2', [tenantId, 'active']);
    for (const u of users.rows) {
      await pool.query(
        'INSERT INTO app_notifications (user_id,tenant_id,title,message,type,link) VALUES ($1,$2,$3,$4,$5,$6)',
        [u.user_id, tenantId, title, message, type, link]
      );
    }
  } catch (e: any) { console.error('[Events] Notify error:', e.message); }
}

// ?? Helper: generate sequential number ????????????????????????????????????
async function getNextNumber(prefix: string, table: string, column: string): Promise<string> {
  const year = new Date().getFullYear();
  const result = await pool.query(
    `SELECT COUNT(*) as count FROM ${table} WHERE ${column} LIKE $1`,
    [`${prefix}-${year}-%`]
  );
  const count = parseInt(result.rows[0].count) + 1;
  return `${prefix}-${year}-${String(count).padStart(4, '0')}`;
}

// ??????????????????????????????????????????????????????????????????????????
// ORDER EVENTS
// ??????????????????????????????????????????????????????????????????????????

// When order is created ? auto-check inventory, raise PO if low stock
export async function onOrderCreated(orderId: number, tenantId: number, items: any[]) {
  try {
    console.log(`[Events] Order created: ${orderId}`);
    for (const item of items) {
      // Check inventory level
      const stock = await pool.query(
        'SELECT * FROM inventory_items WHERE tenant_id=$1 AND item_name ILIKE $2',
        [tenantId, `%${item.product_name}%`]
      );
      if (stock.rows.length > 0) {
        const inv = stock.rows[0];
        const newStock = parseFloat(inv.current_stock) - parseFloat(item.quantity);
        // Update stock
        await pool.query(
          'UPDATE inventory_items SET current_stock=$1 WHERE item_id=$2',
          [Math.max(0, newStock), inv.item_id]
        );
        // Auto-raise PO if below minimum
        if (newStock <= parseFloat(inv.minimum_stock)) {
          const poNumber = await getNextNumber('PO', 'purchase_orders', 'po_number');
          const reorderQty = parseFloat(inv.maximum_stock) - newStock;
          await pool.query(
            `INSERT INTO purchase_orders (tenant_id, po_number, total_amount, status, notes)
             VALUES ($1,$2,$3,$4,$5)`,
            [tenantId, poNumber, reorderQty * parseFloat(inv.unit_price), 'Draft',
             `Auto-raised: ${inv.item_name} stock low (${newStock} remaining, minimum: ${inv.minimum_stock})`]
          );
          await notify(tenantId,
            `?? Auto PO Raised ? ${inv.item_name}`,
            `Stock dropped to ${newStock} units (min: ${inv.minimum_stock}). PO ${poNumber} auto-created for ${reorderQty} units.`,
            'warning', '/supply-mgmt'
          );
          console.log(`[Events] Auto PO raised: ${poNumber} for ${inv.item_name}`);
        }
      }
    }
  } catch (e: any) { console.error('[Events] onOrderCreated error:', e.message); }
}

// When order status changes to Delivered ? update revenue KPI
export async function onOrderDelivered(orderId: number, tenantId: number, amount: number) {
  try {
    console.log(`[Events] Order delivered: ${orderId}, amount: ${amount}`);
    await notify(tenantId,
      `? Order Delivered`,
      `Order #${orderId} delivered. Revenue: ?${amount.toLocaleString('en-IN')}`,
      'success', '/order-mgmt'
    );
  } catch (e: any) { console.error('[Events] onOrderDelivered error:', e.message); }
}

// ??????????????????????????????????????????????????????????????????????????
// EMPLOYEE EVENTS
// ??????????????????????????????????????????????????????????????????????????

// When new employee added ? auto-create payroll profile + assign training + notify
export async function onEmployeeCreated(employee: any, tenantId: number) {
  try {
    console.log(`[Events] New employee: ${employee.name}`);

    // Auto-assign mandatory training courses
    const mandatoryTrainings = [
      { course: 'Company Induction & Orientation', category: 'Compliance', duration: 8 },
      { course: 'Cybersecurity Awareness', category: 'Compliance', duration: 4 },
      { course: 'Code of Conduct & Ethics', category: 'Compliance', duration: 4 },
    ];
    for (const t of mandatoryTrainings) {
      await pool.query(
        `INSERT INTO training_enrollments (tenant_id, employee_name, department, course_name, category, duration_hours, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [tenantId, employee.name, employee.department, t.course, t.category, t.duration, 'Enrolled']
      );
    }

    // Auto-create approval request for IT setup
    await pool.query(
      `INSERT INTO approval_requests (tenant_id, type, title, description, requested_by, status)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [tenantId, 'IT Setup', `New Employee IT Setup ? ${employee.name}`,
       `Please setup laptop, email, and system access for ${employee.name} (${employee.department} - ${employee.designation})`,
       'HR System', 'Pending']
    );

    // Notify HR and managers
    await notify(tenantId,
      `?? New Employee Joined ? ${employee.name}`,
      `${employee.name} has joined as ${employee.designation} in ${employee.department}. 3 mandatory trainings assigned. IT setup request created.`,
      'info', '/resources-mgmt'
    );

    console.log(`[Events] Employee ${employee.name}: 3 trainings assigned, IT setup requested`);
  } catch (e: any) { console.error('[Events] onEmployeeCreated error:', e.message); }
}

// ??????????????????????????????????????????????????????????????????????????
// LEAVE EVENTS
// ??????????????????????????????????????????????????????????????????????????

// When leave is submitted ? create approval request + notify + WhatsApp
export async function onLeaveSubmitted(leave: any, tenantId: number) {
  try {
    console.log(`[Events] Leave submitted: ${leave.employee_name}`);

    // Create approval request
    await pool.query(
      `INSERT INTO approval_requests (tenant_id, type, title, description, requested_by, status)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [tenantId, 'Leave',
       `Leave Request ? ${leave.employee_name}`,
       `${leave.leave_type} from ${leave.start_date} to ${leave.end_date} (${leave.total_days} days). Reason: ${leave.reason}`,
       leave.employee_name, 'Pending']
    );

    // In-app notification
    await notify(tenantId,
      `?? Leave Request ? ${leave.employee_name}`,
      `${leave.employee_name} requested ${leave.leave_type} for ${leave.total_days} day(s) starting ${leave.start_date}`,
      'info', '/leave-mgmt'
    );

    // WhatsApp to manager phone from env
    const managerPhone = process.env.MANAGER_WHATSAPP || '';
    if (managerPhone) {
      await sendWhatsApp(managerPhone,
        `*Deemona ERP ? Leave Approval Required*\n\n` +
        `Employee: *${leave.employee_name}*\n` +
        `Type: ${leave.leave_type}\n` +
        `Duration: ${leave.total_days} day(s) ? ${leave.start_date} to ${leave.end_date}\n` +
        `Reason: ${leave.reason}\n\n` +
        `?? Approve/Reject: https://finance-frontend-2l6b.onrender.com/leave-mgmt`
      );
    }
  } catch (e: any) { console.error('[Events] onLeaveSubmitted error:', e.message); }
}

// When leave is approved/rejected ? notify employee
export async function onLeaveStatusChanged(leave: any, tenantId: number, newStatus: string) {
  try {
    const icon = newStatus === 'Approved' ? '?' : '?';
    await notify(tenantId,
      `${icon} Leave ${newStatus} ? ${leave.employee_name}`,
      `Your ${leave.leave_type} request for ${leave.total_days} day(s) has been ${newStatus.toLowerCase()}.`,
      newStatus === 'Approved' ? 'success' : 'error', '/leave-mgmt'
    );
  } catch (e: any) { console.error('[Events] onLeaveStatusChanged error:', e.message); }
}

// ??????????????????????????????????????????????????????????????????????????
// EXPENSE EVENTS
// ??????????????????????????????????????????????????????????????????????????

// When expense submitted ? create approval + check budget
export async function onExpenseSubmitted(expense: any, tenantId: number) {
  try {
    console.log(`[Events] Expense submitted: ${expense.title} ?${expense.amount}`);

    // Create approval request
    await pool.query(
      `INSERT INTO approval_requests (tenant_id, type, title, description, requested_by, amount, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [tenantId, 'Expense',
       `Expense Claim ? ${expense.title}`,
       `${expense.category} expense of ?${expense.amount} by ${expense.employee_name} (${expense.department})`,
       expense.employee_name, expense.amount, 'Pending']
    );

    await notify(tenantId,
      `?? Expense Claim ? ${expense.employee_name}`,
      `?${parseFloat(expense.amount).toLocaleString('en-IN')} ${expense.category} claim pending approval from ${expense.employee_name}`,
      'info', '/expense-mgmt'
    );
  } catch (e: any) { console.error('[Events] onExpenseSubmitted error:', e.message); }
}

// When expense approved ? auto-deduct from department budget
export async function onExpenseApproved(expense: any, tenantId: number) {
  try {
    console.log(`[Events] Expense approved: ${expense.title}, deducting from budget`);

    // Find active budget for this department
    const budget = await pool.query(
      `SELECT * FROM budgets WHERE tenant_id=$1 AND department=$2 AND status='Active'
       ORDER BY created_at DESC LIMIT 1`,
      [tenantId, expense.department]
    );

    if (budget.rows.length > 0) {
      const b = budget.rows[0];
      const newSpent = parseFloat(b.spent_amount) + parseFloat(expense.amount);
      await pool.query(
        'UPDATE budgets SET spent_amount=$1 WHERE budget_id=$2',
        [newSpent, b.budget_id]
      );

      // Log transaction
      await pool.query(
        'INSERT INTO budget_transactions (budget_id, amount, description, type, date) VALUES ($1,$2,$3,$4,$5)',
        [b.budget_id, expense.amount, `Expense: ${expense.title} by ${expense.employee_name}`, 'expense', new Date()]
      );

      // Check if budget now over 80%
      const pct = (newSpent / parseFloat(b.allocated_amount)) * 100;
      if (pct >= 80) {
        await notify(tenantId,
          `?? Budget Warning ? ${expense.department}`,
          `${expense.department} budget is now at ${pct.toFixed(1)}% utilisation after expense approval.`,
          pct >= 100 ? 'error' : 'warning', '/budget-mgmt'
        );
        // WhatsApp finance head
        const financePhone = process.env.FINANCE_HEAD_WHATSAPP || '';
        if (financePhone) {
          await sendWhatsApp(financePhone,
            `*Deemona ERP ? Budget Alert*\n\n${expense.department} budget: *${pct.toFixed(1)}%* used\n\nReview: https://finance-frontend-2l6b.onrender.com/budget-mgmt`
          );
        }
      }
      console.log(`[Events] Budget updated: ${expense.department} now at ${pct.toFixed(1)}%`);
    }
  } catch (e: any) { console.error('[Events] onExpenseApproved error:', e.message); }
}

// ??????????????????????????????????????????????????????????????????????????
// HELPDESK EVENTS
// ??????????????????????????????????????????????????????????????????????????

// When ticket created ? auto-assign + notify + WhatsApp if critical
export async function onTicketCreated(ticket: any, tenantId: number) {
  try {
    console.log(`[Events] Ticket created: ${ticket.title} [${ticket.priority}]`);

    await notify(tenantId,
      `?? New Ticket ? ${ticket.priority} Priority`,
      `#${ticket.ticket_number}: ${ticket.title} raised by ${ticket.requester_name}`,
      ticket.priority === 'Critical' ? 'error' : 'info', '/helpdesk'
    );

    // WhatsApp IT head if critical
    if (ticket.priority === 'Critical') {
      const itPhone = process.env.IT_HEAD_WHATSAPP || '';
      if (itPhone) {
        await sendWhatsApp(itPhone,
          `*?? Deemona ERP ? Critical Ticket*\n\n` +
          `Ticket: *${ticket.ticket_number}*\n` +
          `Issue: ${ticket.title}\n` +
          `Raised by: ${ticket.requester_name}\n` +
          `Category: ${ticket.category}\n\n` +
          `?? Resolve: https://finance-frontend-2l6b.onrender.com/helpdesk`
        );
      }
      console.log(`[Events] Critical ticket ? WhatsApp sent to IT head`);
    }
  } catch (e: any) { console.error('[Events] onTicketCreated error:', e.message); }
}

// ??????????????????????????????????????????????????????????????????????????
// INVOICE EVENTS
// ??????????????????????????????????????????????????????????????????????????

// When invoice approved/paid ? notify finance
export async function onInvoiceStatusChanged(invoice: any, tenantId: number, newStatus: string) {
  try {
    if (newStatus === 'Paid') {
      await notify(tenantId,
        `?? Invoice Paid ? ${invoice.customer_name}`,
        `Invoice ${invoice.invoice_number} of ?${parseFloat(invoice.total_amount).toLocaleString('en-IN')} from ${invoice.customer_name} has been paid.`,
        'success', '/invoices'
      );
    } else if (newStatus === 'Overdue') {
      await notify(tenantId,
        `?? Invoice Overdue ? ${invoice.customer_name}`,
        `Invoice ${invoice.invoice_number} of ?${parseFloat(invoice.total_amount).toLocaleString('en-IN')} is overdue. Follow up required.`,
        'error', '/invoices'
      );
    }
  } catch (e: any) { console.error('[Events] onInvoiceStatusChanged error:', e.message); }
}

// ??????????????????????????????????????????????????????????????????????????
// PURCHASE ORDER EVENTS
// ??????????????????????????????????????????????????????????????????????????

// When PO created ? create approval request + notify + WhatsApp approver
export async function onPOCreated(po: any, tenantId: number) {
  try {
    console.log(`[Events] PO created: ${po.po_number}`);

    // Create approval request
    await pool.query(
      `INSERT INTO approval_requests (tenant_id, type, title, description, requested_by, amount, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [tenantId, 'Purchase Order',
       `PO Approval ? ${po.po_number}`,
       `Purchase order ${po.po_number} for ?${parseFloat(po.total_amount).toLocaleString('en-IN')} requires approval`,
       'Procurement', po.total_amount, 'Pending']
    );

    await notify(tenantId,
      `?? PO Created ? ${po.po_number}`,
      `Purchase order ${po.po_number} for ?${parseFloat(po.total_amount).toLocaleString('en-IN')} pending approval`,
      'info', '/supply-mgmt'
    );

    // WhatsApp approver
    const approverPhone = process.env.MANAGER_WHATSAPP || '';
    if (approverPhone) {
      await sendWhatsApp(approverPhone,
        `*Deemona ERP ? PO Approval Required*\n\n` +
        `PO Number: *${po.po_number}*\n` +
        `Amount: *?${parseFloat(po.total_amount).toLocaleString('en-IN')}*\n` +
        `Notes: ${po.notes || 'N/A'}\n\n` +
        `?? Approve: https://finance-frontend-2l6b.onrender.com/supply-mgmt`
      );
    }
  } catch (e: any) { console.error('[Events] onPOCreated error:', e.message); }
}

// ??????????????????????????????????????????????????????????????????????????
// AUTO NUMBERING
// ??????????????????????????????????????????????????????????????????????????
export async function generateInvoiceNumber(tenantId: number): Promise<string> {
  const year = new Date().getFullYear();
  const result = await pool.query(
    `SELECT COUNT(*) as count FROM generated_invoices WHERE tenant_id=$1 AND invoice_number LIKE $2`,
    [tenantId, `INV-${year}-%`]
  );
  const count = parseInt(result.rows[0].count) + 1;
  return `INV-${year}-${String(count).padStart(4, '0')}`;
}

export async function generatePONumber(tenantId: number): Promise<string> {
  const year = new Date().getFullYear();
  const result = await pool.query(
    `SELECT COUNT(*) as count FROM generated_pos WHERE tenant_id=$1 AND po_number LIKE $2`,
    [tenantId, `PO-${year}-%`]
  );
  const count = parseInt(result.rows[0].count) + 1;
  return `PO-${year}-${String(count).padStart(4, '0')}`;
}

export async function generateOrderNumber(tenantId: number): Promise<string> {
  const year = new Date().getFullYear();
  const result = await pool.query(
    `SELECT COUNT(*) as count FROM orders WHERE tenant_id=$1 AND order_number LIKE $2`,
    [tenantId, `ORD-${year}-%`]
  );
  const count = parseInt(result.rows[0].count) + 1;
  return `ORD-${year}-${String(count).padStart(4, '0')}`;
}

export async function generateTicketNumber(tenantId: number): Promise<string> {
  const year = new Date().getFullYear();
  const result = await pool.query(
    `SELECT COUNT(*) as count FROM helpdesk_tickets WHERE tenant_id=$1 AND ticket_number LIKE $2`,
    [tenantId, `TKT-${year}-%`]
  );
  const count = parseInt(result.rows[0].count) + 1;
  return `TKT-${year}-${String(count).padStart(4, '0')}`;
}

export async function generateEmployeeCode(tenantId: number): Promise<string> {
  const result = await pool.query(
    `SELECT COUNT(*) as count FROM employees WHERE tenant_id=$1`,
    [tenantId]
  );
  const count = parseInt(result.rows[0].count) + 1;
  return `EMP${String(count).padStart(4, '0')}`;
}

// ??????????????????????????????????????????????????????????????????????????
// BULK IMPORT ENHANCED PIPELINE
// ??????????????????????????????????????????????????????????????????????????
export async function processBulkImport(jobId: number, tenantId: number, module: string, rows: any[]) {
  let processed = 0;
  let failed = 0;
  const errors: string[] = [];

  try {
    await pool.query('UPDATE bulk_import_jobs SET status=$1 WHERE job_id=$2', ['Processing', jobId]);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        switch (module) {
          case 'employees':
            const empCode = await generateEmployeeCode(tenantId);
            await pool.query(
              `INSERT INTO employees (tenant_id,employee_code,name,email,phone,department,designation,salary,status,join_date)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT DO NOTHING`,
              [tenantId, empCode, row.name, row.email, row.phone, row.department,
               row.designation, row.salary||0, row.status||'Active', row.join_date||new Date()]
            );
            break;
          case 'inventory':
            await pool.query(
              `INSERT INTO inventory_items (tenant_id,item_name,item_code,category,current_stock,minimum_stock,unit_price)
               VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING`,
              [tenantId, row.item_name, row.item_code, row.category||'General',
               row.current_stock||0, row.minimum_stock||10, row.unit_price||0]
            );
            break;
          case 'customers':
            await pool.query(
              `INSERT INTO customers (tenant_id,company_name,contact_name,email,phone,industry,status)
               VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING`,
              [tenantId, row.company_name, row.contact_name, row.email, row.phone,
               row.industry||'General', row.status||'Lead']
            );
            break;
          case 'vendors':
            await pool.query(
              `INSERT INTO vendors (tenant_id,vendor_name,category,contact_person,email,phone,status)
               VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING`,
              [tenantId, row.vendor_name, row.category||'General', row.contact_person,
               row.email, row.phone, row.status||'Active']
            );
            break;
          default:
            errors.push(`Row ${i+1}: Unknown module ${module}`);
            failed++;
            continue;
        }
        processed++;
      } catch (rowErr: any) {
        failed++;
        errors.push(`Row ${i+1}: ${rowErr.message}`);
      }
    }

    await pool.query(
      'UPDATE bulk_import_jobs SET status=$1,processed_rows=$2,failed_rows=$3,errors=$4 WHERE job_id=$5',
      [failed === 0 ? 'Completed' : 'Completed with errors', processed, failed, JSON.stringify(errors), jobId]
    );

    await notify(tenantId,
      `?? Bulk Import ${failed === 0 ? 'Complete' : 'Completed with Errors'}`,
      `${module}: ${processed} records imported, ${failed} failed.${errors.length > 0 ? ' Check import log for details.' : ''}`,
      failed === 0 ? 'success' : 'warning', '/bulk-import'
    );

    console.log(`[BulkImport] Job ${jobId}: ${processed} ok, ${failed} failed`);
    return { processed, failed, errors };
  } catch (e: any) {
    await pool.query('UPDATE bulk_import_jobs SET status=$1 WHERE job_id=$2', ['Failed', jobId]);
    throw e;
  }
}
