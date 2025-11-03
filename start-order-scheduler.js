const OrderScheduler = require('./lib/order-scheduler');

/**
 * Production Order Scheduler Startup Script
 * This script starts the order scheduler to run automatic archiving and deletion
 */

async function startProductionScheduler() {
  console.log('🚀 Starting GKICKS Order Scheduler');
  console.log('==================================\n');

  const scheduler = new OrderScheduler();

  try {
    // Get initial statistics
    console.log('📊 Getting current order statistics...');
    const stats = await scheduler.getStats();
    
    if (stats) {
      console.log('Current Order Statistics:');
      console.log(`  📦 Total orders: ${stats.total_orders}`);
      console.log(`  🗃️  Archived orders: ${stats.archived_orders}`);
      console.log(`  ✅ Completed but not archived: ${stats.completed_not_archived}`);
      console.log(`  🔄 Active orders: ${stats.active_orders}`);
      console.log(`  📅 Ready for archiving: ${stats.ready_for_archiving}`);
      console.log(`  🗑️  Ready for deletion: ${stats.ready_for_deletion}\n`);
    }

    // Start the scheduler with default schedule (daily at 2:00 AM UTC)
    scheduler.start();

    console.log('✅ Order Scheduler is now running!');
    console.log('📅 Automatic maintenance will run daily at 2:00 AM UTC');
    console.log('📝 Logs will be saved to ./logs/order-maintenance.log');
    console.log('📝 Error logs will be saved to ./logs/order-maintenance-errors.log\n');

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Received SIGINT, shutting down gracefully...');
      scheduler.stop();
      console.log('✅ Order Scheduler stopped');
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
      scheduler.stop();
      console.log('✅ Order Scheduler stopped');
      process.exit(0);
    });

    // Keep the process running
    console.log('⏳ Scheduler is running... Press Ctrl+C to stop');
    
    // Optional: Run maintenance immediately on startup if there are orders ready
    if (stats && (stats.ready_for_archiving > 0 || stats.ready_for_deletion > 0)) {
      console.log('\n🔄 Found orders ready for maintenance, running initial cleanup...');
      await scheduler.runNow();
    }

    // Keep process alive
    setInterval(() => {
      // Check if scheduler is still running every hour
      const status = scheduler.getStatus();
      if (!status.isRunning) {
        console.log('⚠️  Scheduler stopped unexpectedly, restarting...');
        scheduler.start();
      }
    }, 3600000); // Check every hour

  } catch (error) {
    console.error('❌ Failed to start scheduler:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Start the scheduler
startProductionScheduler();