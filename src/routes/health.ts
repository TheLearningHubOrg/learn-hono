import { Hono } from 'hono';
import type { HealthStatus } from '../types.js';

export const healthRouter = new Hono();

healthRouter.get('/', (c) => {
  const mem = process.memoryUsage();
  const status: HealthStatus = {
    status: 'healthy',
    uptimeSeconds: Math.round(process.uptime()),
    memoryUsageMb: Math.round(mem.heapUsed / 1024 / 1024),
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  };

  return c.json({
    success: true,
    data: status
  });
});
