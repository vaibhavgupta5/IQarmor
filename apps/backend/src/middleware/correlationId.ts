import { RequestHandler } from 'express';
import crypto from 'crypto';
import { logger } from '../lib/logger';

export const correlationIdMiddleware: RequestHandler = (req, res, next) => {
  const existingId = req.header('X-Correlation-ID');
  const correlationId = existingId || crypto.randomUUID();

  req.correlationId = correlationId;
  res.setHeader('X-Correlation-ID', correlationId);

  // Attach to child logger for this request
  (req as any).logger = logger.child({ correlationId });

  next();
};
