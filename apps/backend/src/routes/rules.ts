import { Router } from 'express';
import { z } from 'zod';
import { validateBody, validateQuery } from '../middleware/validate';
import { asyncWrapper } from '../middleware/asyncWrapper';
import { prisma } from '../lib/prisma';
import { initPolicyEngine } from '../lib/policy-engine-instance';
import { RuleType, TimeoutAction } from '@prisma/client';

export const rulesRouter = Router();

const QuerySchema = z.object({
  type: z.nativeEnum(RuleType).optional(),
  isActive: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(200).default(50)
});

rulesRouter.get('/', validateQuery(QuerySchema), asyncWrapper(async (req, res) => {
  const query = req.query as unknown as z.infer<typeof QuerySchema>;
  
  const where: any = {};
  if (query.type) where.type = query.type;
  if (query.isActive !== undefined) where.isActive = query.isActive === 'true';
  else where.isActive = true;
  
  if (query.search) {
    where.toolPattern = { contains: query.search };
  }

  const skip = (query.page - 1) * query.limit;

  const [total, data] = await Promise.all([
    prisma.rule.count({ where }),
    prisma.rule.findMany({
      where,
      orderBy: { priority: 'desc' },
      skip,
      take: query.limit
    })
  ]);

  res.status(200).json({
    data,
    meta: { total, page: query.page, limit: query.limit }
  });
}));

const CreateSchema = z.object({
  type: z.nativeEnum(RuleType),
  toolPattern: z.string().min(1),
  condition: z.any().optional(),
  priority: z.number().default(0),
  ttlSeconds: z.number().optional(),
  onTimeout: z.nativeEnum(TimeoutAction).optional(),
  isActive: z.boolean().default(true)
});

rulesRouter.post('/', validateBody(CreateSchema), asyncWrapper(async (req, res) => {
  const body = req.body as z.infer<typeof CreateSchema>;
  
  const created = await prisma.rule.create({
    data: {
      ...body,
      createdBy: req.user!.id
    } as any
  });

  await initPolicyEngine();

  res.status(201).json({ data: created });
}));

const UpdateSchema = CreateSchema.partial();

rulesRouter.put('/:id', validateBody(UpdateSchema), asyncWrapper(async (req, res) => {
  const id = req.params.id as string;
  const body = req.body as z.infer<typeof UpdateSchema>;

  const updated = await prisma.rule.update({
    where: { id },
    data: body
  });

  await initPolicyEngine();
  res.status(200).json({ data: updated });
}));

rulesRouter.delete('/:id', asyncWrapper(async (req, res) => {
  const id = req.params.id as string;
  
  await prisma.rule.delete({ where: { id } });
  
  await initPolicyEngine();
  res.status(200).json({ data: { success: true } });
}));

rulesRouter.patch('/:id/toggle', validateBody(z.object({ isActive: z.boolean() })), asyncWrapper(async (req, res) => {
  const id = req.params.id as string;
  const { isActive } = req.body;

  const updated = await prisma.rule.update({
    where: { id },
    data: { isActive }
  });

  await initPolicyEngine();
  res.status(200).json({ data: updated });
}));

rulesRouter.get('/templates', asyncWrapper(async (req, res) => {
  const templates = await prisma.ruleTemplate.findMany();
  res.status(200).json({ data: templates });
}));

rulesRouter.post('/import', validateBody(z.object({ rules: z.array(CreateSchema) })), asyncWrapper(async (req, res) => {
  const { rules } = req.body;
  
  const created = await prisma.rule.createMany({
    data: rules.map((r: any) => ({ ...r, createdBy: req.user!.id }))
  });

  await initPolicyEngine();
  res.status(201).json({ data: { count: created.count } });
}));

rulesRouter.get('/export', asyncWrapper(async (req, res) => {
  const rules = await prisma.rule.findMany();
  res.setHeader('Content-Disposition', `attachment; filename="armoriq-rules-${new Date().toISOString()}.json"`);
  res.setHeader('Content-Type', 'application/json');
  res.status(200).send(JSON.stringify(rules, null, 2));
}));
