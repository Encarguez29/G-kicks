# Order Archiving System

This system automatically archives completed orders after 1 year and deletes archived orders after 3 years, helping to maintain database performance and comply with data retention policies.

## Overview

The order archiving system consists of three main components:

1. **OrderArchivingService** - Core service that handles archiving and deletion logic
2. **OrderScheduler** - Scheduler that runs maintenance tasks automatically
3. **Database Migration** - Adds the `archived_at` field to the orders table

## How It Works

### Archiving Process (1 Year)
- **Completed Orders**: Orders with status `delivered` or `cancelled`
- **Timing**: Orders are archived 1 year after completion
- **Completion Date Logic**:
  - For `delivered` orders: Uses `delivered_at` if available, otherwise `created_at`
  - For `cancelled` orders: Uses `created_at`
- **Action**: Sets the `archived_at` timestamp in the orders table

### Deletion Process (3 Years)
- **Target**: Archived orders older than 3 years
- **Action**: Permanently deletes orders and associated data:
  - Order records from `orders` table
  - Order items from `order_items` table
  - Delivery notifications from `delivery_notifications` table
  - Notification views from `notification_views` table

## Database Schema Changes

The system adds the following to the `orders` table:

```sql
-- New column
ALTER TABLE orders ADD COLUMN archived_at TIMESTAMP NULL AFTER delivered_at;

-- Performance indexes
CREATE INDEX idx_archived_at ON orders(archived_at);
CREATE INDEX idx_delivered_at ON orders(delivered_at);
CREATE INDEX idx_status_created_at ON orders(status, created_at);
CREATE INDEX idx_archived_at_status ON orders(archived_at, status);
```

## Files Structure

```
├── lib/
│   ├── order-archiving-service.js  # Core archiving logic
│   └── order-scheduler.js          # Scheduling system
├── logs/                           # Generated log files
│   ├── order-maintenance.log       # Maintenance results
│   └── order-maintenance-errors.log # Error logs
├── start-order-scheduler.js        # Production startup script
├── test-order-archiving.js         # Test archiving service
├── test-order-scheduler.js         # Test scheduler
├── run-archiving-migration.js      # Database migration
└── ORDER-ARCHIVING-README.md       # This documentation
```

## Usage

### 1. Run Database Migration (One-time setup)

```bash
node run-archiving-migration.js
```

This will:
- Add the `archived_at` column to the orders table
- Create necessary indexes for performance
- Archive any existing completed orders older than 1 year

### 2. Start the Scheduler (Production)

```bash
node start-order-scheduler.js
```

This will:
- Start the scheduler to run daily at 2:00 AM UTC
- Run initial maintenance if orders are ready for archiving/deletion
- Keep running until manually stopped (Ctrl+C)
- Log all maintenance activities

### 3. Manual Maintenance (Optional)

```bash
# Test the archiving service
node test-order-archiving.js

# Test the scheduler
node test-order-scheduler.js
```

## Configuration

### Schedule Customization

To change the maintenance schedule, modify the cron expression in `OrderScheduler.start()`:

```javascript
// Default: Daily at 2:00 AM UTC
'0 2 * * *'

// Examples:
'0 3 * * *'     // Daily at 3:00 AM UTC
'0 2 * * 0'     // Weekly on Sunday at 2:00 AM UTC
'0 2 1 * *'     // Monthly on 1st day at 2:00 AM UTC
```

### Database Configuration

The system uses environment variables from `.env.local`:

```env
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=gkicks
```

## Monitoring

### Log Files

The system creates detailed logs in the `logs/` directory:

- **order-maintenance.log**: JSON logs of each maintenance run
- **order-maintenance-errors.log**: Error logs for troubleshooting

### Statistics

Get current order statistics:

```javascript
const OrderArchivingService = require('./lib/order-archiving-service');
const service = new OrderArchivingService();
const stats = await service.getArchivingStats();
console.log(stats);
```

## API Reference

### OrderArchivingService

```javascript
const service = new OrderArchivingService();

// Archive completed orders older than 1 year
const archiveResults = await service.archiveCompletedOrders();

// Delete archived orders older than 3 years
const deleteResults = await service.deleteOldArchivedOrders();

// Run both archiving and deletion
const results = await service.runMaintenanceTasks();

// Get statistics
const stats = await service.getArchivingStats();
```

### OrderScheduler

```javascript
const scheduler = new OrderScheduler();

// Start with default schedule (daily at 2:00 AM UTC)
scheduler.start();

// Start with custom schedule
scheduler.startWithCustomSchedule('0 3 * * *');

// Stop scheduler
scheduler.stop();

// Run maintenance immediately
const results = await scheduler.runNow();

// Get scheduler status
const status = scheduler.getStatus();
```

## Safety Features

1. **Transaction Safety**: Deletions use database transactions to ensure data consistency
2. **Error Handling**: Comprehensive error handling with detailed logging
3. **Graceful Shutdown**: Proper cleanup when stopping the scheduler
4. **Validation**: Checks order status and dates before archiving/deletion
5. **Logging**: Detailed logs for monitoring and troubleshooting

## Performance Considerations

1. **Indexes**: Added database indexes for efficient querying
2. **Batch Processing**: Processes orders one by one to avoid memory issues
3. **Scheduled Timing**: Runs during low-traffic hours (2:00 AM UTC)
4. **Incremental**: Only processes orders that meet the criteria

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Check `.env.local` configuration
   - Verify MySQL server is running
   - Confirm database credentials

2. **No Orders Being Archived**
   - Check if orders have the correct status (`delivered` or `cancelled`)
   - Verify orders are older than 1 year
   - Check if `archived_at` is already set

3. **Scheduler Not Running**
   - Check for error logs in `logs/order-maintenance-errors.log`
   - Verify node-cron is installed
   - Check system time and timezone

### Debug Mode

Enable debug logging by setting environment variable:

```bash
DEBUG=true node start-order-scheduler.js
```

## Security Notes

- The system only processes orders based on status and date criteria
- No sensitive data is logged
- Database credentials are read from environment variables
- Deletion operations are irreversible - ensure proper backups

## Maintenance

- Monitor log files regularly
- Review archiving statistics periodically
- Ensure adequate disk space for logs
- Consider log rotation for long-running systems

## Support

For issues or questions about the order archiving system:

1. Check the log files in `logs/` directory
2. Run the test scripts to verify functionality
3. Review this documentation for configuration options
4. Check database connectivity and permissions