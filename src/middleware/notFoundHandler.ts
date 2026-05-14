import { Request, Response, NextFunction } from 'express';
import { notFound } from './errorHandler';

export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  next(notFound(`Route ${req.originalUrl} not found`));
};
