# Auto-Delivery System Setup Guide

## Overview

The auto-delivery system automatically marks orders as "delivered" after 30 days if:
- The order status is "shipped"
- The order was shipped more than 30 days ago
- The customer hasn't manually marked it as delivered
- There are no pending or approved refund requests for the order

## Components

### 1. API Endpoint
- **Path**: `/api/admin/auto-delivery`
- **Methods**: GET (check eligible orders), POST (process auto-delivery)
- **Authentication**: Admin JWT token or API key

### 2. Scheduler Module
- **Path**: `lib/schedulers/auto-delivery.ts`
- **Functions**: Core logic for finding and processing eligible orders

### 3. Execution Scripts
- **Node.js Script**: `scripts/run-auto-delivery.js`
- **Windows Batch**: `scripts/run-auto-delivery.bat`

## Environment Variables

Add these to your `.env.local` file:

```env
# Auto-delivery API key for scheduled tasks
AUTO_DELIVERY_API_KEY=your-secure-api-key-here

# Optional: Custom API URL for the script
AUTO_DELIVERY_API_URL=http://localhost:3000/api/admin/auto-delivery

# Optional: Log file path
AUTO_DELIVERY_LOG_FILE=logs/auto-delivery.log
```

## Setup Instructions

### Option 1: Windows Task Scheduler (Recommended for Windows)

1. **Open Task Scheduler**
   - Press `Win + R`, type `taskschd.msc`, press Enter

2. **Create Basic Task**
   - Click "Create Basic Task" in the right panel
   - Name: "GKicks Auto-Delivery"
   - Description: "Automatically mark shipped orders as delivered after 30 days"

3. **Set Trigger**
   - Choose "Daily"
   - Set start time (recommended: 2:00 AM)
   - Recur every 1 day

4. **Set Action**
   - Choose "Start a program"
   - Program/script: `D:\path\to\your\project\scripts\run-auto-delivery.bat`
   - Start in: `D:\path\to\your\project`

5. **Configure Settings**
   - Check "Run whether user is logged on or not"
   - Check "Run with highest privileges"
   - Configure for your Windows version

### Option 2: Manual Execution

#### Using Node.js directly:
```bash
cd /path/to/your/project
node scripts/run-auto-delivery.js
```

#### Using Windows batch file:
```cmd
cd /path/to/your/project
scripts\run-auto-delivery.bat
```

### Option 3: API Calls

#### Check eligible orders:
```bash
curl -X GET http://localhost:3000/api/admin/auto-delivery \
  -H "x-api-key: your-api-key"
```

#### Process auto-delivery:
```bash
curl -X POST http://localhost:3000/api/admin/auto-delivery \
  -H "x-api-key: your-api-key" \
  -H "Content-Type: application/json"
```

## Testing

### 1. Test API Endpoint
```bash
# Check if there are eligible orders
curl -X GET http://localhost:3000/api/admin/auto-delivery \
  -H "x-api-key: your-api-key"
```

### 2. Test Script Execution
```bash
# Run the Node.js script
node scripts/run-auto-delivery.js
```

### 3. Test with Sample Data
Create test orders in your database with:
- Status: 'shipped'
- shipped_at: 31+ days ago
- delivered_at: NULL
- No refund requests

## Monitoring and Logs

### Log Files
- Default location: `logs/auto-delivery-YYYY-MM-DD.log`
- Format: JSON lines with timestamp, results, and errors

### Log Entry Example
```json
{
  "timestamp": "2024-01-15T02:00:00.000Z",
  "totalEligible": 5,
  "processed": 5,
  "errors": 0,
  "results": [
    {
      "orderId": 123,
      "orderNumber": "GK1001",
      "daysSinceShipped": 35,
      "status": "success"
    }
  ]
}
```

### Monitoring Checklist
- [ ] Check logs daily for errors
- [ ] Monitor processed order counts
- [ ] Verify customer notifications are sent
- [ ] Check database consistency

## Database Changes

The system creates these records when processing orders:

### 1. Orders Table Updates
```sql
UPDATE orders 
SET status = 'delivered', 
    delivered_at = NOW(), 
    updated_at = NOW() 
WHERE id = ?
```

### 2. Delivery Notifications
```sql
INSERT INTO delivery_notifications (
  user_id, order_id, notification_type, title, message, created_at, is_read
) VALUES (?, ?, 'delivery_confirmation', ?, ?, NOW(), 0)
```

### 3. Order Status History
```sql
INSERT INTO order_status_history (
  order_id, old_status, new_status, changed_by, change_reason, created_at
) VALUES (?, 'shipped', 'delivered', 'system', ?, NOW())
```

## Security Considerations

1. **API Key Security**
   - Use a strong, unique API key
   - Store in environment variables, not in code
   - Rotate keys periodically

2. **Access Control**
   - Only admin users can access the API
   - API key provides alternative authentication for scheduled tasks

3. **Audit Trail**
   - All auto-deliveries are logged in order_status_history
   - Includes timestamp and reason for change

## Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Check API key in environment variables
   - Verify admin user permissions

2. **No Eligible Orders**
   - Check order statuses in database
   - Verify shipped_at timestamps
   - Check for refund requests

3. **Script Execution Errors**
   - Verify Node.js is installed and accessible
   - Check file permissions
   - Review log files for detailed errors

4. **Database Connection Issues**
   - Verify database credentials
   - Check database server status
   - Review connection pool settings

### Debug Commands

```bash
# Check Node.js version
node --version

# Test database connection
npm run db:test

# Check environment variables
echo $AUTO_DELIVERY_API_KEY

# Manual API test
curl -v -X GET http://localhost:3000/api/admin/auto-delivery \
  -H "x-api-key: $AUTO_DELIVERY_API_KEY"
```

## Customization

### Modify Delivery Timeframe
Edit `lib/schedulers/auto-delivery.ts`:
```typescript
// Change from 30 days to 45 days
AND DATEDIFF(NOW(), o.shipped_at) >= 45
```

### Custom Notification Messages
Edit the notification message in `lib/schedulers/auto-delivery.ts`:
```typescript
message: `Your custom message for order ${order.order_number}...`
```

### Additional Criteria
Add more conditions to the eligible orders query:
```sql
AND o.total_amount > 100  -- Only orders over $100
AND o.shipping_country = 'US'  -- Only US orders
```

## Support

For issues or questions:
1. Check the logs first
2. Review this documentation
3. Test with manual API calls
4. Contact system administrator

---

**Last Updated**: January 2024
**Version**: 1.0