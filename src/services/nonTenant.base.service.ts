import pool from '../config/database';

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class NonTenantBaseService {
  protected tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  async findAll(options: PaginationOptions = {}) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const offset = (page - 1) * limit;
    const sortBy = options.sortBy || 'created_at';
    const sortOrder = options.sortOrder || 'desc';

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM ${this.tableName}`;
    const countResult = await pool.query(countQuery);
    const total = parseInt(countResult.rows[0].count);

    // Get paginated data
    const query = `
      SELECT * FROM ${this.tableName}
      ORDER BY ${sortBy} ${sortOrder}
      LIMIT $1 OFFSET $2
    `;
    const result = await pool.query(query, [limit, offset]);

    return {
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: number) {
    const idColumn = this.getIdColumn();
    const query = `SELECT * FROM ${this.tableName} WHERE ${idColumn} = $1`;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  async create(data: Record<string, any>) {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');

    const query = `
      INSERT INTO ${this.tableName} (${columns.join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  async update(id: number, data: Record<string, any>) {
    const idColumn = this.getIdColumn();
    const columns = Object.keys(data);
    const values = Object.values(data);
    const setClause = columns.map((col, i) => `${col} = $${i + 2}`).join(', ');

    const query = `
      UPDATE ${this.tableName}
      SET ${setClause}, updated_at = NOW()
      WHERE ${idColumn} = $1
      RETURNING *
    `;

    const result = await pool.query(query, [id, ...values]);
    return result.rows[0] || null;
  }

  async delete(id: number) {
    const idColumn = this.getIdColumn();
    const query = `DELETE FROM ${this.tableName} WHERE ${idColumn} = $1 RETURNING *`;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  async search(searchTerm: string, fields: string[]) {
    const conditions = fields.map((field, i) => 
      `${field}::text ILIKE $${i + 1}`
    ).join(' OR ');
    
    const searchValue = `%${searchTerm}%`;
    const values = fields.map(() => searchValue);

    const query = `
      SELECT * FROM ${this.tableName}
      WHERE ${conditions}
      LIMIT 20
    `;

    const result = await pool.query(query, values);
    return result.rows;
  }

  protected getIdColumn(): string {
    // Try to determine the ID column name
    const tableSingular = this.tableName.replace(/s$/, '');
    return `${tableSingular}_id`;
  }
}
