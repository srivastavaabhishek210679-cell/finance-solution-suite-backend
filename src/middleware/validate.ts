import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { unprocessableEntity } from './errorHandler';

// Validation middleware factory
export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));
      next(
        unprocessableEntity(
          `Validation error: ${errors.map((e) => e.message).join(', ')}`
        )
      );
    } else {
      req.body = value;
      next();
    }
  };
};

// Common validation schemas
export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string(),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
});

export const idParamSchema = Joi.object({
  id: Joi.number().integer().min(1).required(),
});
