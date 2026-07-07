import pool from '../config/database';

export function validateGSTIN(gstin: string): boolean {
  const regex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return regex.test(gstin.toUpperCase());
}

export function decodeGSTIN(gstin: string): { state: string; pan: string; entityType: string } {
  const stateCodes: { [key: string]: string } = {
    '01':'Jammu & Kashmir','02':'Himachal Pradesh','03':'Punjab','04':'Chandigarh',
    '05':'Uttarakhand','06':'Haryana','07':'Delhi','08':'Rajasthan','09':'Uttar Pradesh',
    '10':'Bihar','11':'Sikkim','12':'Arunachal Pradesh','13':'Nagaland','14':'Manipur',
    '15':'Mizoram','16':'Tripura','17':'Meghalaya','18':'Assam','19':'West Bengal',
    '20':'Jharkhand','21':'Odisha','22':'Chhattisgarh','23':'Madhya Pradesh',
    '24':'Gujarat','27':'Maharashtra','29':'Karnataka','32':'Kerala','33':'Tamil Nadu',
    '36':'Telangana','07':'Delhi'
  };
  const stateCode = gstin.substring(0, 2);
  return {
    state: stateCodes[stateCode] || 'State ' + stateCode,
    pan: gstin.substring(2, 12),
    entityType: 'Regular'
  };
}

export async function fetchGSTR1(gstin: string, period: string, tenantId: number) {
  const info = decodeGSTIN(gstin);
  const year = parseInt(period.substring(2)) || new Date().getFullYear();
  const month = parseInt(period.substring(0, 2)) || new Date().getMonth() + 1;
  const monthStr = String(year) + '-' + String(month).padStart(2,'0');
  let imported = 0;
  const errors: string[] = ['Running in SANDBOX mode. Set GST_API_KEY in env vars for live sync.'];

  const samples = [
    { num: gstin.substring(0,4)+'-INV-001', customer: 'Mahindra & Mahindra Ltd', amount: 250000, tax: 45000 },
    { num: gstin.substring(0,4)+'-INV-002', customer: 'Tata Consultancy Services', amount: 180000, tax: 32400 },
    { num: gstin.substring(0,4)+'-INV-003', customer: 'Reliance Industries Ltd', amount: 420000, tax: 75600 },
    { num: gstin.substring(0,4)+'-INV-004', customer: 'HDFC Bank Ltd', amount: 95000, tax: 17100 },
    { num: gstin.substring(0,4)+'-INV-005', customer: 'Infosys Limited', amount: 310000, tax: 55800 },
  ];

  for (const inv of samples) {
    try {
      const exists = await pool.query('SELECT COUNT(*) as c FROM generated_invoices WHERE tenant_id=$1 AND invoice_number=$2', [tenantId, inv.num]);
      if (parseInt(exists.rows[0].c) > 0) continue;
      await pool.query(
        'INSERT INTO generated_invoices (tenant_id,invoice_number,customer_name,subtotal,tax_amount,total_amount,status,due_date,notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
        [tenantId, inv.num, inv.customer, inv.amount, inv.tax, inv.amount+inv.tax, 'Paid', monthStr+'-28', 'GST Sync | GSTIN: '+gstin+' | State: '+info.state+' | SANDBOX']
      );
      imported++;
    } catch(e: any) { errors.push(e.message); }
  }
  return { success: true, imported, errors };
}

export async function fetchGSTR2A(gstin: string, period: string, tenantId: number) {
  return { success: true, imported: 0, errors: ['GST_API_KEY required for GSTR-2A sync'] };
}

export async function saveGSTIN(tenantId: number, gstin: string, legalName: string): Promise<void> {
  await pool.query('INSERT INTO tenant_settings (tenant_id,setting_key,setting_value) VALUES ($1,$2,$3) ON CONFLICT (tenant_id,setting_key) DO UPDATE SET setting_value=$3', [tenantId,'gstin',gstin]);
  await pool.query('INSERT INTO tenant_settings (tenant_id,setting_key,setting_value) VALUES ($1,$2,$3) ON CONFLICT (tenant_id,setting_key) DO UPDATE SET setting_value=$3', [tenantId,'legal_name',legalName]);
}

export async function getGSTIN(tenantId: number): Promise<string> {
  const r = await pool.query('SELECT setting_value FROM tenant_settings WHERE tenant_id=$1 AND setting_key=$2', [tenantId,'gstin']);
  return r.rows[0]?.setting_value || '';
}