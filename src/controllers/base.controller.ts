import { Request, Response, NextFunction } from 'express';
import { BaseService, PaginationParams } from '../services/base.service';
import { AuthRequest } from '../middleware/auth';

export class BaseController<T = any> {
  protected service: BaseService<T>;

  constructor(service: BaseService<T>) {
    this.service = service;
  }

  // GET /resource - Get all records
  getAll = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const params: PaginationParams = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        sortBy: req.query.sortBy as string,
        sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'asc',
      };

      const tenantId = (req as AuthRequest).user?.tenantId;
      const result = await this.service.findAll(params, tenantId);

      res.status(200).json({
        status: 'success',
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  };

  // GET /resource/:id - Get single record
  getById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      const tenantId = (req as AuthRequest).user?.tenantId;
      const data = await this.service.findById(id, tenantId);

      res.status(200).json({
        status: 'success',
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  // POST /resource - Create new record
  create = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = (req as AuthRequest).user?.tenantId;
      const data = await this.service.create(req.body, tenantId);

      res.status(201).json({
        status: 'success',
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  // PUT /resource/:id - Update record
  update = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      const tenantId = (req as AuthRequest).user?.tenantId;
      const data = await this.service.update(id, req.body, tenantId);

      res.status(200).json({
        status: 'success',
        data,
      });
    } catch (error) {
      next(error);
    }
  };

  // DELETE /resource/:id - Delete record
  delete = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      const tenantId = (req as AuthRequest).user?.tenantId;
      await this.service.delete(id, tenantId);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  // GET /resource/search?q=term - Search records
  search = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const searchTerm = req.query.q as string;
      const searchFields = (req.query.fields as string)?.split(',') || [];

      const params: PaginationParams = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        sortBy: req.query.sortBy as string,
        sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'asc',
      };

      const tenantId = (req as AuthRequest).user?.tenantId;
      const result = await this.service.search(
        searchTerm,
        searchFields,
        params,
        tenantId
      );

      res.status(200).json({
        status: 'success',
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  };
}
