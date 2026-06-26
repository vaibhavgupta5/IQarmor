import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding ArmorIQ database...');

  // Seed Rule Templates
  const templateCount = await prisma.ruleTemplate.count();
  if (templateCount === 0) {
    await prisma.ruleTemplate.createMany({
      data: [
        {
          name: 'Block All Destructive Tools',
          description: 'Block tools matching delete_*, drop_*, remove_* patterns',
          category: 'SECURITY',
          ruleConfig: { type: 'BLOCK', toolPattern: 'delete_*', priority: 10 }
        },
        {
          name: 'Require Approval for Send Operations',
          description: 'Any send_* tool requires human approval with 2-minute timeout',
          category: 'SECURITY',
          ruleConfig: { type: 'APPROVE', toolPattern: 'send_*', ttlSeconds: 120, onTimeout: 'DENY', priority: 8 }
        },
        {
          name: 'Block Internal Domain Leakage',
          description: 'Prevent checking internal domains via external threat intel tools',
          category: 'COMPLIANCE',
          ruleConfig: { type: 'VALIDATE', toolPattern: 'check_domain', condition: { field: 'domain', operator: 'not_contains', value: 'internal' }, priority: 5 }
        },
        {
          name: 'Token Budget 4000',
          description: 'Limit conversations to 4000 tokens to control API costs',
          category: 'COST',
          ruleConfig: { type: 'BUDGET', toolPattern: '*', condition: { field: 'count', operator: 'lt', value: 4000 }, priority: 1 }
        },
        {
          name: 'Rate Limit Domain Checks',
          description: 'Maximum 10 domain checks per conversation (VirusTotal free tier protection)',
          category: 'COST',
          ruleConfig: { type: 'RATE_LIMIT', toolPattern: 'check_domain', condition: { field: 'count', operator: 'lt', value: 10 }, priority: 1 }
        },
        {
          name: 'OWASP Agentic Starter Pack',
          description: 'Covers ASI01-ASI08: injection detection + approval gates + rate limits',
          category: 'SECURITY',
          ruleConfig: { type: 'BLOCK', toolPattern: '*', priority: 0, note: 'Placeholder — apply individual rules for each OWASP control' }
        }
      ]
    });
    console.log('✅ Rule templates seeded');
  }

  // Seed a demo MCP server config pointing to local threatintel-mcp
  const localExists = await prisma.mcpServerConfig.findUnique({
    where: { name: 'threatintel-mcp' }
  });
  if (!localExists) {
    await prisma.mcpServerConfig.create({
      data: {
        name: 'threatintel-mcp',
        transport: 'STREAMABLE_HTTP',
        config: { url: process.env.THREATINTEL_MCP_URL || 'http://localhost:3002/mcp' },
        isActive: true,
        allowedTools: [],
        discoveredTools: [],
        addedVia: 'MANUAL'
      }
    });
    console.log('Demo MCP server config seeded');
  }

  // Seed exa-mcp by default using STDIO transport
  const exaExists = await prisma.mcpServerConfig.findUnique({
    where: { name: 'exa-mcp' }
  });
  if (!exaExists) {
    await prisma.mcpServerConfig.create({
      data: {
        name: 'exa-mcp',
        transport: 'STDIO',
        config: { url: 'npx exa-mcp-server' },
        isActive: true,
        allowedTools: [],
        discoveredTools: [],
        addedVia: 'MANUAL'
      }
    });
    console.log('Default remote MCP server config (exa-mcp) seeded');
  }

  // Seed context7-mcp by default using STREAMABLE_HTTP transport
  const context7Exists = await prisma.mcpServerConfig.findUnique({
    where: { name: 'context7-mcp' }
  });
  if (!context7Exists) {
    await prisma.mcpServerConfig.create({
      data: {
        name: 'context7-mcp',
        transport: 'STREAMABLE_HTTP',
        config: { url: 'https://mcp.context7.com/mcp' },
        isActive: true,
        allowedTools: [],
        discoveredTools: [],
        addedVia: 'MANUAL'
      }
    });
    console.log('Default remote SSE MCP server config (context7-mcp) seeded');
  }

  console.log('Seeding complete.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
