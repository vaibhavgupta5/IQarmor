import { mcpManager } from './manager';
import { getIo } from '../ws/socket-handler';
import { prisma } from '../lib/prisma';

export class HealthMonitor {
  private timer: NodeJS.Timeout | null = null;

  start(intervalMs: number = 30000): void {
    this.timer = setInterval(async () => {
      await mcpManager.pingAll();
    }, intervalMs);
  }

  async markUnhealthy(serverName: string): Promise<void> {
    const config = await prisma.mcpServerConfig.findUnique({ where: { name: serverName } });
    if (config) {
      await prisma.mcpServerConfig.update({ where: { id: config.id }, data: { isHealthy: false }});
      try {
        getIo().emit('server:health', [{ name: serverName, healthy: false }]);
      } catch(e) {}
    }
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

export const healthMonitor = new HealthMonitor();
