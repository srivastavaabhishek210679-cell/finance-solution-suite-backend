import { Request, Response } from 'express';
import { NonTenantBaseService } from '../services/nonTenant.base.service';
import { notFound } from '../middleware/errorHandler';

export class NonTenantBaseController {
  protected service: NonTenantBaseService;

  constructor(tableName: string) {
    this.service = new NonTenantBaseService(tableName);
  }

  getAll = async (req: Request, res: Response) => {
    const { page, limit, sortBy, sortOrder } = req.query;

    const result = await this.service.findAll({
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc',
    });

    res.status(200).json({
      status: 'success',
      data: result.data,
      pagination: result.pagination,
    });
  };

  getById = async (req: Request, res: Response) => {
    const { id } = req.params;
    const data = await this.service.findById(parseInt(id));

    if (!data) {
      throw notFound('Record not found');
    }

    res.status(200).json({
      status: 'success',
      data,
    });
  };

  create = async (req: Request, res: Response) => {
    const data = await this.service.create(req.body);
    
    res.status(201).json({
      status: 'success',
      data,
      message: 'Record created successfully',
    });
  };

  update = async (req: Request, res: Response) => {
    const { id } = req.params;
    const data = await this.service.update(parseInt(id), req.body);

    if (!data) {
      throw notFound('Record not found');
    }

    res.status(200).json({
      status: 'success',
      data,
      message: 'Record updated successfully',
    });
  };

  delete = async (req: Request, res: Response) => {
    const { id } = req.params;
    const data = await this.service.delete(parseInt(id));

    if (!data) {
      throw notFound('Record not found');
    }

    res.status(200).json({
      status: 'success',
      data,
      message: 'Record deleted successfully',
    });
  };

  search = async (req: Request, res: Response) => {
    const { q, fields } = req.query;

    if (!q || !fields) {
      res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'Query parameter "q" and "fields" are required',
      });
      return;
    }

    const searchFields = (fields as string).split(',');
    const data = await this.service.search(q as string, searchFields);

    res.status(200).json({
      status: 'success',
      data,
    });
  };
}
