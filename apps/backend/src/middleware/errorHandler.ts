import { ErrorRequestHandler } from 'express';
import { logger } from '../lib/logger';
import { z } from 'zod';

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  const correlationId = req.correlationId;

  if (err instanceof z.ZodError) {
    res.status(400).json({
      error: 'Validation failed',
      fields: err.errors.map((e) => ({ field: e.path.join('.'), message: e.message }))
    });
    return;
  }

  // Handle Prisma known errors
  if (err?.code === 'P2002') {
    res.status(409).json({ error: 'Conflict: resource already exists', correlationId });
    return;
  }
  if (err?.code === 'P2025') {
    res.status(404).json({ error: 'Not found: resource does not exist', correlationId });
    return;
  }

  logger.error({ err, correlationId }, 'Unhandled error');

  if (process.env.NODE_ENV === 'production') {
    res.status(500).json({ error: 'Internal server error', correlationId });
  } else {
    res.status(500).json({ error: err.message || 'Internal server error', correlationId, stack: err.stack });
  }
};
