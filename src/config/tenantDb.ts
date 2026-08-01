import pool from '../config/database';

// Tenant-aware query wrapper ? automatically appends tenant_id to WHERE clause
export class TenantDB {
  private tenantId: number;

  constructor(tenantId: number) {
    this.tenantId = tenantId;
  }

  // Raw query (use for complex queries)
  async query(text: string, params: any[] = []) {
    return pool.query(text, params);
  }

  // Get all rows for this tenant
  async getAll(table: string, extraWhere: string = '', params: any[] = [], select: string = '*') {
    const where = extraWhere ? `tenant_id=$1 AND ${extraWhere}` : 'tenant_id=$1';
    const sql = `SELECT ${select} FROM ${table} WHERE ${where} ORDER BY created_at DESC`;
    return pool.query(sql, [this.tenantId, ...params]);
  }

  // Get one row for this tenant
  async getOne(table: string, idCol: string, id: number, select: string = '*') {
    const sql = `SELECT ${select} FROM ${table} WHERE tenant_id=$1 AND ${idCol}=$2`;
    return pool.query(sql, [this.tenantId, id]);
  }

  // Insert with tenant_id
  async insert(table: string, cols: string[], vals: any[], returning: string = '*') {
    const allCols = ['tenant_id', ...cols];
    const allVals = [this.tenantId, ...vals];
    const placeholders = allVals.map((_, i) => `$${i + 1}`).join(',');
    const sql = `INSERT INTO ${table} (${allCols.join(',')}) VALUES (${placeholders}) RETURNING ${returning}`;
    return pool.query(sql, allVals);
  }

  // Update with tenant_id check
  async update(table: string, idCol: string, id: number, cols: string[], vals: any[], returning: string = '*') {
    const sets = cols.map((c, i) => `${c}=$${i + 2}`).join(',');
    const sql = `UPDATE ${table} SET ${sets}, updated_at=NOW() WHERE ${idCol}=$1 AND tenant_id=$${cols.length + 2} RETURNING ${returning}`;
    return pool.query(sql, [id, ...vals, this.tenantId]);
  }

  // Delete with tenant_id check
  async delete(table: string, idCol: string, id: number) {
    const sql = `DELETE FROM ${table} WHERE ${idCol}=$1 AND tenant_id=$2`;
    return pool.query(sql, [id, this.tenantId]);
  }

  // Count rows for tenant
  async count(table: string, extraWhere: string = '', params: any[] = []): Promise<number> {
    const where = extraWhere ? `tenant_id=$1 AND ${extraWhere}` : 'tenant_id=$1';
    const sql = `SELECT COUNT(*) as c FROM ${table} WHERE ${where}`;
    const result = await pool.query(sql, [this.tenantId, ...params]);
    return parseInt(result.rows[0].c);
  }

  get id() { return this.tenantId; }
}

// Factory function
export function getTenantDB(req: any): TenantDB {
  const tenantId = req.user?.tenantId || 1;
  return new TenantDB(tenantId);
}
