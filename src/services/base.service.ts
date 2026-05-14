import { query } from '../config/database';
import { QueryResult } from 'pg';
import { notFound } from '../middleware/errorHandler';

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class BaseService<T = any> {
  protected tableName: string;
  protected primaryKey: string;

  constructor(tableName: string, primaryKey: string = 'id') {
    this.tableName = tableName;
    this.primaryKey = primaryKey;
  }

  // Get all records with pagination
  async findAll(
    params: PaginationParams,
    tenantId?: number
  ): Promise<PaginatedResult<T>> {
    const { page, limit, sortBy, sortOrder } = params;
    const offset = (page - 1) * limit;

    // Build WHERE clause for tenant isolation
    const whereClause = tenantId ? `WHERE tenant_id = $1` : '';
    const countParams = tenantId ? [tenantId] : [];
    const queryParams = tenantId
      ? [tenantId, limit, offset]
      : [limit, offset];

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM ${this.tableName} ${whereClause}`;
    const countResult = await query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    // Build ORDER BY clause
    const orderBy = sortBy
      ? `ORDER BY ${sortBy} ${sortOrder || 'asc'}`
      : `ORDER BY ${this.primaryKey} DESC`;

    // Get paginated data
    const dataQuery = tenantId
      ? `SELECT * FROM ${this.tableName} WHERE tenant_id = $1 ${orderBy} LIMIT $2 OFFSET $3`
      : `SELECT * FROM ${this.tableName} ${orderBy} LIMIT $1 OFFSET $2`;

    const dataResult = await query(dataQuery, queryParams);

    return {
      data: dataResult.rows as T[],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Get single record by ID
  async findById(id: number, tenantId?: number): Promise<T> {
    const whereClause = tenantId
      ? `WHERE ${this.primaryKey} = $1 AND tenant_id = $2`
      : `WHERE ${this.primaryKey} = $1`;
    const params = tenantId ? [id, tenantId] : [id];

    const result = await query(
      `SELECT * FROM ${this.tableName} ${whereClause}`,
      params
    );

    if (result.rows.length === 0) {
      throw notFound(`${this.tableName} not found`);
    }

    return result.rows[0] as T;
  }

  // Create new record
  async create(data: Partial<T>, tenantId?: number): Promise<T> {
    // Add tenant_id if provided
    const insertData = tenantId ? { ...data, tenant_id: tenantId } : data;

    const keys = Object.keys(insertData);
    const values = Object.values(insertData);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

    const result = await query(
      `INSERT INTO ${this.tableName} (${keys.join(', ')}) 
       VALUES (${placeholders}) 
       RETURNING *`,
      values
    );

    return result.rows[0] as T;
  }

  // Update record
  async update(
    id: number,
    data: Partial<T>,
    tenantId?: number
  ): Promise<T> {
    // Check if record exists
    await this.findById(id, tenantId);

    const keys = Object.keys(data);
    const values = Object.values(data);
    const setClause = keys
      .map((key, i) => `${key} = $${i + 1}`)
      .join(', ');

    const whereClause = tenantId
      ? `WHERE ${this.primaryKey} = $${keys.length + 1} AND tenant_id = $${keys.length + 2}`
      : `WHERE ${this.primaryKey} = $${keys.length + 1}`;

    const params = tenantId
      ? [...values, id, tenantId]
      : [...values, id];

    const result = await query(
      `UPDATE ${this.tableName} 
       SET ${setClause}, updated_at = NOW() 
       ${whereClause} 
       RETURNING *`,
      params
    );

    return result.rows[0] as T;
  }

  // Delete record
  async delete(id: number, tenantId?: number): Promise<void> {
    // Check if record exists
    await this.findById(id, tenantId);

    const whereClause = tenantId
      ? `WHERE ${this.primaryKey} = $1 AND tenant_id = $2`
      : `WHERE ${this.primaryKey} = $1`;
    const params = tenantId ? [id, tenantId] : [id];

    await query(
      `DELETE FROM ${this.tableName} ${whereClause}`,
      params
    );
  }

  // Search records
  async search(
    searchTerm: string,
    searchFields: string[],
    params: PaginationParams,
    tenantId?: number
  ): Promise<PaginatedResult<T>> {
    const { page, limit, sortBy, sortOrder } = params;
    const offset = (page - 1) * limit;

    // Build search conditions
    const searchConditions = searchFields
      .map((field, i) => `${field}::text ILIKE $${i + 1}`)
      .join(' OR ');

    const searchPattern = `%${searchTerm}%`;
    const searchParams = searchFields.map(() => searchPattern);

    // Build WHERE clause
    const tenantClause = tenantId
      ? `tenant_id = $${searchFields.length + 1} AND`
      : '';
    const whereClause = `WHERE ${tenantClause} (${searchConditions})`;

    // Count query
    const countParams = tenantId
      ? [...searchParams, tenantId]
      : searchParams;
    const countResult = await query(
      `SELECT COUNT(*) FROM ${this.tableName} ${whereClause}`,
      countParams
    );
    const total = parseInt(countResult.rows[0].count);

    // Data query
    const orderBy = sortBy
      ? `ORDER BY ${sortBy} ${sortOrder || 'asc'}`
      : `ORDER BY ${this.primaryKey} DESC`;

    const dataParams = tenantId
      ? [...searchParams, tenantId, limit, offset]
      : [...searchParams, limit, offset];

    const dataQuery = tenantId
      ? `SELECT * FROM ${this.tableName} ${whereClause} ${orderBy} LIMIT $${searchFields.length + 2} OFFSET $${searchFields.length + 3}`
      : `SELECT * FROM ${this.tableName} ${whereClause} ${orderBy} LIMIT $${searchFields.length + 1} OFFSET $${searchFields.length + 2}`;

    const dataResult = await query(dataQuery, dataParams);

    return {
      data: dataResult.rows as T[],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
