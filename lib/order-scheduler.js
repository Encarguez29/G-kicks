const cron = require('node-cron');
const OrderArchivingService = require('./order-archiving-service');

/**
 * Order Scheduler Service
 * Handles automatic scheduling of order archiving and deletion tasks
 */
class OrderScheduler {
  constructor() {
    this.archivingService = new OrderArchivingService();
    this.tasks = new Map();
    this.isRunning = false;
  }

  /**
   * Start the scheduler with default schedule
   * Runs daily at 2:00 AM
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️  Scheduler is already running');
      return;
    }

    console.log('🚀 Starting Order Scheduler...');
    
    // Schedule daily maintenance at 2:00 AM
    const dailyTask = cron.schedule('0 2 * * *', async () => {
      console.log('\n⏰ Running scheduled order maintenance...');
      await this.runMaintenanceTasks();
    }, {
      scheduled: false,
      timezone: 'UTC'
    });

    this.tasks.set('daily-maintenance', dailyTask);
    dailyTask.start();

    this.isRunning = true;
    console.log('✅ Order Scheduler started successfully');
    console.log('📅 Daily maintenance scheduled for 2:00 AM UTC');
  }

  /**
   * Start the scheduler with custom schedule
   * @param {string} cronExpression - Cron expression for scheduling
   */
  startWithCustomSchedule(cronExpression) {
    if (this.isRunning) {
      console.log('⚠️  Scheduler is already running');
      return;
    }

    console.log(`🚀 Starting Order Scheduler with custom schedule: ${cronExpression}`);
    
    const customTask = cron.schedule(cronExpression, async () => {
      console.log('\n⏰ Running scheduled order maintenance...');
      await this.runMaintenanceTasks();
    }, {
      scheduled: false,
      timezone: 'UTC'
    });

    this.tasks.set('custom-maintenance', customTask);
    customTask.start();

    this.isRunning = true;
    console.log('✅ Order Scheduler started successfully');
    console.log(`📅 Maintenance scheduled with: ${cronExpression}`);
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (!this.isRunning) {
      console.log('⚠️  Scheduler is not running');
      return;
    }

    console.log('🛑 Stopping Order Scheduler...');
    
    this.tasks.forEach((task, name) => {
      task.stop();
      console.log(`✅ Stopped task: ${name}`);
    });

    this.tasks.clear();
    this.isRunning = false;
    console.log('✅ Order Scheduler stopped successfully');
  }

  /**
   * Run maintenance tasks manually
   */
  async runMaintenanceTasks() {
    try {
      const results = await this.archivingService.runMaintenanceTasks();
      
      // Log results to a file for monitoring
      await this.logMaintenanceResults(results);
      
      return results;
    } catch (error) {
      console.error('❌ Scheduled maintenance failed:', error.message);
      await this.logError(error);
      throw error;
    }
  }

  /**
   * Log maintenance results to file
   */
  async logMaintenanceResults(results) {
    const fs = require('fs').promises;
    const path = require('path');
    
    try {
      const logDir = path.join(__dirname, '..', 'logs');
      
      // Create logs directory if it doesn't exist
      try {
        await fs.access(logDir);
      } catch {
        await fs.mkdir(logDir, { recursive: true });
      }

      const logFile = path.join(logDir, 'order-maintenance.log');
      const timestamp = new Date().toISOString();
      
      const logEntry = {
        timestamp,
        duration: results.totalDuration,
        archiving: {
          success: results.archiving.success,
          archivedCount: results.archiving.archivedCount,
          errors: results.archiving.errors
        },
        deletion: {
          success: results.deletion.success,
          deletedCount: results.deletion.deletedCount,
          deletedOrderItems: results.deletion.deletedOrderItems,
          errors: results.deletion.errors
        }
      };

      await fs.appendFile(logFile, JSON.stringify(logEntry) + '\n');
      console.log(`📝 Maintenance results logged to: ${logFile}`);
    } catch (error) {
      console.error('❌ Failed to log maintenance results:', error.message);
    }
  }

  /**
   * Log errors to file
   */
  async logError(error) {
    const fs = require('fs').promises;
    const path = require('path');
    
    try {
      const logDir = path.join(__dirname, '..', 'logs');
      
      // Create logs directory if it doesn't exist
      try {
        await fs.access(logDir);
      } catch {
        await fs.mkdir(logDir, { recursive: true });
      }

      const errorLogFile = path.join(logDir, 'order-maintenance-errors.log');
      const timestamp = new Date().toISOString();
      
      const errorEntry = {
        timestamp,
        error: error.message,
        stack: error.stack
      };

      await fs.appendFile(errorLogFile, JSON.stringify(errorEntry) + '\n');
      console.log(`📝 Error logged to: ${errorLogFile}`);
    } catch (logError) {
      console.error('❌ Failed to log error:', logError.message);
    }
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      activeTasks: Array.from(this.tasks.keys()),
      taskCount: this.tasks.size
    };
  }

  /**
   * Run maintenance immediately (for testing)
   */
  async runNow() {
    console.log('🔄 Running maintenance tasks immediately...');
    return await this.runMaintenanceTasks();
  }

  /**
   * Get maintenance statistics
   */
  async getStats() {
    return await this.archivingService.getArchivingStats();
  }
}

module.exports = OrderScheduler;