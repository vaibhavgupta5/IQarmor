import { Router } from 'express';
import { mcpManager } from '../mcp/manager';

export const toolsRouter = Router();

toolsRouter.get('/', (req, res) => {
  const tools = mcpManager.getAllTools();
  
  const byServer: Record<string, any[]> = {};
  for (const t of tools) {
    if (!byServer['all']) byServer['all'] = [];
    byServer['all'].push(t);
  }

  res.status(200).json({
    data: {
      byServer,
      total: tools.length
    }
  });
});
