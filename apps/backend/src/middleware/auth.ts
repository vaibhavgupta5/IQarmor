import { RequestHandler } from 'express';
import { supabaseAdmin } from '../lib/supabase';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string };
      correlationId?: string;
    }
  }
}

export const requireAuth: RequestHandler = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized', code: 'AUTH_REQUIRED' });
    return;
  }

  const token = authHeader.split(' ')[1]!;
  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) {
    res.status(401).json({ error: 'Unauthorized', code: 'AUTH_INVALID' });
    return;
  }

  req.user = {
    id: data.user.id,
    email: data.user.email ?? '',
  };
  
  next();
};
