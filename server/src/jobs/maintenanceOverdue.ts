import { prisma } from '../config/prisma.js';
import { logger } from '../utils/logger.js';

export async function checkOverdueMaintenance(): Promise<number> {
  try {
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

    const overdueCount = await prisma.maintenanceRequest.count({
      where: {
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        createdAt: { lt: fortyEightHoursAgo },
      },
    });

    return overdueCount;
  } catch (err) {
    logger.error('Error checking overdue maintenance requests:', err);
    return 0;
  }
}
