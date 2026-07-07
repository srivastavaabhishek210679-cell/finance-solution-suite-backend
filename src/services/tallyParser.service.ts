import { parseStringPromise } from 'xml2js';
import pool from '../config/database';

// ??????????????????????????????????????????????????????????????????????????
// TALLY XML PARSER
// Supports: Day Book, Ledger Masters, Stock Items, Party Masters
// How to export from Tally:
//   Gateway of Tally ? Display ? Day Book ? Export ? XML
//   Gateway of Tally ? Display ? Account Books ? Ledger ? Export ? XML
// ??????????????????????????????????????????????????????????????????????????

interface TallyVoucher {
  type: string;
  date: string;
  narration: string;
  amount: number;
  party: string;
  ledgers: { name: string; amount: number }[];
}

// ?? Parse Tally Date (YYYYMMDD ? Date) ????????????????????????????????????
function parseTallyDate(tallyDate: string): string {
  if (!tallyDate || tallyDate.length !== 8) return new Date().toISOString().split('T')[0];
  const y = tallyDate.substring(0, 4);
  const m = tallyDate.substring(4, 6);
  const d = tallyDate.substring(6, 8);
  return `${y}-${m}-${d}`;
}

// ?? Extract text value from Tally XML node ?????????????????????????????????
function val(node: any): string {
  if (!node) return '';
  if (typeof node === 'string') return node.trim();
  if (Array.isArray(node)) return val(node[0]);
  if (node._) return node._.trim();
  return String(node).trim();
}

// ?? Parse amount (Tally uses negative for credit) ?????????????????????????
function parseAmount(node: any): number {
  const str = val(node).replace(/,/g, '');
  return Math.abs(parseFloat(str) || 0);
}

// ??????????????????????????????????????????????????????????????????????????
// MAIN PARSER ? detect XML type and route to correct handler
// ??????????????????????????????????????????????????????????????????????????
export async function parseTallyXML(xmlContent: string, tenantId: number): Promise<{
  success: boolean;
  summary: any;
  errors: string[];
}> {
  const errors: string[] = [];
  const summary: any = {
    vouchers_imported: 0,
    expenses_created: 0,
    invoices_created: 0,
    purchase_orders_created: 0,
    vendors_created: 0,
    customers_created: 0,
    inventory_created: 0,
    budget_transactions_created: 0,
    skipped: 0
  };

  try {
    const parsed = await parseStringPromise(xmlContent, {
      explicitArray: false,
      ignoreAttrs: false,
      trim: true
    });

    // Detect XML type
    const envelope = parsed?.ENVELOPE;
    if (!envelope) throw new Error('Invalid Tally XML ? no ENVELOPE found');

    // Get vouchers from Day Book export
    const body = envelope.BODY || envelope;
    const data = body?.DATA || body;

    // Try multiple Tally XML structures
    let vouchers: any[] = [];
    let stockItems: any[] = [];
    let ledgerMasters: any[] = [];

    // Day Book / Vouchers
    const tallymessage = data?.TALLYMESSAGE || data?.REQUESTDATA?.TALLYMESSAGE;
    if (tallymessage) {
      const msgs = Array.isArray(tallymessage) ? tallymessage : [tallymessage];
      for (const msg of msgs) {
        if (msg?.VOUCHER) {
          const v = Array.isArray(msg.VOUCHER) ? msg.VOUCHER : [msg.VOUCHER];
          vouchers.push(...v);
        }
        if (msg?.STOCKITEM) {
          const s = Array.isArray(msg.STOCKITEM) ? msg.STOCKITEM : [msg.STOCKITEM];
          stockItems.push(...s);
        }
        if (msg?.LEDGER) {
          const l = Array.isArray(msg.LEDGER) ? msg.LEDGER : [msg.LEDGER];
          ledgerMasters.push(...l);
        }
      }
    }

    // Alternative structure
    if (vouchers.length === 0) {
      const collection = data?.COLLECTION;
      if (collection?.VOUCHER) {
        vouchers = Array.isArray(collection.VOUCHER) ? collection.VOUCHER : [collection.VOUCHER];
      }
      if (collection?.STOCKITEM) {
        stockItems = Array.isArray(collection.STOCKITEM) ? collection.STOCKITEM : [collection.STOCKITEM];
      }
      if (collection?.LEDGER) {
        ledgerMasters = Array.isArray(collection.LEDGER) ? collection.LEDGER : [collection.LEDGER];
      }
    }

    console.log(`[Tally] Found: ${vouchers.length} vouchers, ${stockItems.length} stock items, ${ledgerMasters.length} ledgers`);

    // Process vouchers
    for (const voucher of vouchers) {
      try {
        const vType = val(voucher.VOUCHERTYPENAME || voucher.$?.VCHTYPE || '').toUpperCase();
        const date = parseTallyDate(val(voucher.DATE));
        const narration = val(voucher.NARRATION) || val(voucher.PARTYLEDGERNAME) || 'Tally Import';
        const party = val(voucher.PARTYLEDGERNAME) || '';

        // Get ledger entries for amount
        let amount = 0;
        const ledgerEntries = voucher.ALLLEDGERENTRIES || voucher.LEDGERENTRIES || {};
        const entries = Array.isArray(ledgerEntries) ? ledgerEntries : [ledgerEntries];
        for (const entry of entries) {
          if (entry?.AMOUNT) amount = Math.max(amount, parseAmount(entry.AMOUNT));
        }
        if (amount === 0 && voucher.AMOUNT) amount = parseAmount(voucher.AMOUNT);

        // Route by voucher type
        if (vType.includes('PAYMENT') || vType.includes('EXPENSE') || vType.includes('JOURNAL')) {
          await importAsExpense(tenantId, { date, narration, party, amount, vType }, summary, errors);
        } else if (vType.includes('SALES') || vType.includes('INVOICE')) {
          await importAsSalesInvoice(tenantId, { date, narration, party, amount, vType }, summary, errors);
        } else if (vType.includes('PURCHASE')) {
          await importAsPurchase(tenantId, { date, narration, party, amount, vType }, summary, errors);
        } else if (vType.includes('RECEIPT')) {
          await importAsReceipt(tenantId, { date, narration, party, amount, vType }, summary, errors);
        } else {
          summary.skipped++;
        }
        summary.vouchers_imported++;
      } catch (vErr: any) {
        errors.push(`Voucher error: ${vErr.message}`);
      }
    }

    // Process stock items ? inventory
    for (const item of stockItems) {
      try {
        const itemName = val(item.NAME || item.$?.NAME);
        const unit = val(item.BASEUNITS) || 'Units';
        const rate = parseAmount(item.LASTPURCHASECOST || item.RATE || 0);
        const stock = parseAmount(item.CLOSINGBALANCE || 0);

        if (!itemName) continue;

        await pool.query(
          `INSERT INTO inventory_items (tenant_id, item_name, item_code, category, unit, current_stock, minimum_stock, unit_price, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
           ON CONFLICT DO NOTHING`,
          [tenantId, itemName, 'TALLY-' + itemName.substring(0,8).toUpperCase().replace(/\s/g,''),
           'Tally Import', unit, stock, Math.floor(stock * 0.2), rate, 'Active']
        );
        summary.inventory_created++;
      } catch (iErr: any) {
        errors.push(`Stock item error: ${iErr.message}`);
      }
    }

    // Process ledger masters ? customers/vendors
    for (const ledger of ledgerMasters) {
      try {
        const name = val(ledger.NAME || ledger.$?.NAME);
        const group = val(ledger.PARENT).toUpperCase();
        const address = val(ledger.ADDRESS || '');
        const email = val(ledger.EMAIL || '');
        const phone = val(ledger.LEDGERMOBILE || ledger.PHONE || '');
        const gstin = val(ledger.GSTIN || '');

        if (!name) continue;

        // Sundry Debtors ? Customers
        if (group.includes('SUNDRY DEBTOR') || group.includes('DEBTORS')) {
          await pool.query(
            `INSERT INTO customers (tenant_id, company_name, contact_name, email, phone, status, notes)
             VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING`,
            [tenantId, name, name, email, phone, 'Active', gstin ? `GSTIN: ${gstin}` : 'Tally Import']
          );
          summary.customers_created++;
        }
        // Sundry Creditors ? Vendors
        else if (group.includes('SUNDRY CREDITOR') || group.includes('CREDITORS')) {
          await pool.query(
            `INSERT INTO vendors (tenant_id, vendor_name, category, contact_person, email, phone, status, notes)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING`,
            [tenantId, name, 'Tally Import', name, email, phone, 'Active', gstin ? `GSTIN: ${gstin}` : '']
          );
          summary.vendors_created++;
        }
      } catch (lErr: any) {
        errors.push(`Ledger error: ${lErr.message}`);
      }
    }

    return { success: true, summary, errors };

  } catch (e: any) {
    console.error('[Tally] Parse error:', e.message);
    return { success: false, summary, errors: [e.message, ...errors] };
  }
}

// ?? Import as Expense ??????????????????????????????????????????????????????
async function importAsExpense(tenantId: number, v: any, summary: any, errors: string[]) {
  const category = categoriseExpense(v.narration);
  await pool.query(
    `INSERT INTO expenses (tenant_id, title, category, department, amount, expense_date, employee_name, payment_method, status, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT DO NOTHING`,
    [tenantId, v.narration.substring(0, 100), category, 'Finance',
     v.amount, v.date, v.party || 'Tally Import', 'Bank Transfer', 'Approved',
     `Imported from Tally ? ${v.vType}`]
  );

  // Also log as budget transaction
  const budget = await pool.query(
    `SELECT budget_id, spent_amount, allocated_amount FROM budgets WHERE tenant_id=$1 AND status='Active' ORDER BY created_at DESC LIMIT 1`,
    [tenantId]
  );
  if (budget.rows.length > 0) {
    const b = budget.rows[0];
    await pool.query(
      'INSERT INTO budget_transactions (budget_id, amount, description, type, date) VALUES ($1,$2,$3,$4,$5)',
      [b.budget_id, v.amount, v.narration.substring(0, 100), 'expense', v.date]
    );
    await pool.query(
      'UPDATE budgets SET spent_amount=spent_amount+$1 WHERE budget_id=$2',
      [v.amount, b.budget_id]
    );
    summary.budget_transactions_created++;
  }
  summary.expenses_created++;
}

// ?? Import as Sales Invoice ????????????????????????????????????????????????
async function importAsSalesInvoice(tenantId: number, v: any, summary: any, errors: string[]) {
  const year = new Date().getFullYear();
  const count = await pool.query(
    `SELECT COUNT(*) as c FROM generated_invoices WHERE tenant_id=$1 AND invoice_number LIKE $2`,
    [tenantId, `INV-${year}-%`]
  );
  const invNum = `INV-${year}-${String(parseInt(count.rows[0].c)+1).padStart(4,'0')}`;
  const tax = Math.round(v.amount * 0.18);

  await pool.query(
    `INSERT INTO generated_invoices (tenant_id, invoice_number, customer_name, subtotal, tax_amount, total_amount, status, due_date, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT DO NOTHING`,
    [tenantId, invNum, v.party || 'Unknown Customer',
     v.amount - tax, tax, v.amount, 'Paid', v.date,
     `Imported from Tally ? ${v.vType}`]
  );

  // Also create order
  const orderCount = await pool.query(
    `SELECT COUNT(*) as c FROM orders WHERE tenant_id=$1 AND order_number LIKE $2`,
    [tenantId, `ORD-${year}-%`]
  );
  const ordNum = `ORD-${year}-${String(parseInt(orderCount.rows[0].c)+1).padStart(4,'0')}`;
  await pool.query(
    `INSERT INTO orders (tenant_id, order_number, customer_name, total_amount, status, payment_status, order_date)
     VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING`,
    [tenantId, ordNum, v.party || 'Unknown Customer', v.amount, 'Delivered', 'Paid', v.date]
  );
  summary.invoices_created++;
}

// ?? Import as Purchase ?????????????????????????????????????????????????????
async function importAsPurchase(tenantId: number, v: any, summary: any, errors: string[]) {
  // Ensure vendor exists
  await pool.query(
    `INSERT INTO vendors (tenant_id, vendor_name, category, contact_person, status)
     VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
    [tenantId, v.party || 'Unknown Vendor', 'Tally Import', v.party || 'Unknown', 'Active']
  );

  const year = new Date().getFullYear();
  const count = await pool.query(
    `SELECT COUNT(*) as c FROM generated_pos WHERE tenant_id=$1 AND po_number LIKE $2`,
    [tenantId, `PO-${year}-%`]
  );
  const poNum = `PO-${year}-${String(parseInt(count.rows[0].c)+1).padStart(4,'0')}`;

  await pool.query(
    `INSERT INTO generated_pos (tenant_id, po_number, supplier_name, total_amount, status, notes)
     VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING`,
    [tenantId, poNum, v.party || 'Unknown Vendor', v.amount, 'Received',
     `Imported from Tally ? ${v.vType}`]
  );
  summary.purchase_orders_created++;
}

// ?? Import as Receipt (payment received) ??????????????????????????????????
async function importAsReceipt(tenantId: number, v: any, summary: any, errors: string[]) {
  // Update invoice status to paid if matching customer
  await pool.query(
    `UPDATE generated_invoices SET status='Paid'
     WHERE tenant_id=$1 AND customer_name ILIKE $2 AND status='Sent'`,
    [tenantId, `%${v.party}%`]
  );
  summary.vouchers_imported++;
}

// ?? Auto-categorise expense from narration ?????????????????????????????????
function categoriseExpense(narration: string): string {
  const n = narration.toLowerCase();
  if (n.includes('salary') || n.includes('payroll') || n.includes('wages')) return 'Payroll';
  if (n.includes('rent') || n.includes('lease') || n.includes('office')) return 'Rent';
  if (n.includes('electricity') || n.includes('power') || n.includes('utility')) return 'Utilities';
  if (n.includes('travel') || n.includes('flight') || n.includes('hotel') || n.includes('cab')) return 'Travel';
  if (n.includes('software') || n.includes('subscription') || n.includes('license') || n.includes('aws') || n.includes('cloud')) return 'Software';
  if (n.includes('hardware') || n.includes('laptop') || n.includes('computer') || n.includes('server')) return 'Hardware';
  if (n.includes('marketing') || n.includes('advertis') || n.includes('campaign')) return 'Marketing';
  if (n.includes('training') || n.includes('course') || n.includes('workshop')) return 'Training';
  if (n.includes('telephone') || n.includes('internet') || n.includes('mobile') || n.includes('broadband')) return 'Communication';
  if (n.includes('insurance')) return 'Insurance';
  if (n.includes('tax') || n.includes('gst') || n.includes('tds')) return 'Tax';
  if (n.includes('bank') || n.includes('charge') || n.includes('fee')) return 'Bank Charges';
  if (n.includes('repair') || n.includes('maintenance')) return 'Maintenance';
  if (n.includes('food') || n.includes('meal') || n.includes('canteen')) return 'Meals';
  return 'General';
}
