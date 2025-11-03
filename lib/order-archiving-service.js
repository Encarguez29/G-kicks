const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

/**
 * Order Archiving Service
 * Handles automatic archiving of completed orders after 1 year
 * and deletion of archived orders after 3 years
 */
class OrderArchivingService {
  constructor() {
    this.dbConfig = {
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT) || 3306,
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'gkicks'
    };
  }

  /**
   * Get database connection
   */
  async getConnection() {
    return await mysql.createConnection(this.dbConfig);
  }

  /**
   * Archive completed orders that are older than 1 year
   * Completed orders are those with status: 'delivered' or 'cancelled'
   */
  async archiveCompletedOrders() {
    let connection;
    const results = {
      success: false,
      archivedCount: 0,
      errors: [],
      details: []
    };

    try {
      connection = await this.getConnection();
      
      console.log('🔄 Starting automatic order archiving...');
      
      // Find orders that should be archived
      const [ordersToArchive] = await connection.execute(`
        SELECT 
          id, 
          order_number, 
          status, 
          created_at,
          delivered_at,
          CASE 
            WHEN status = 'delivered' AND delivered_at IS NOT NULL THEN delivered_at
            WHEN status = 'delivered' AND delivered_at IS NULL THEN created_at
            WHEN status = 'cancelled' THEN created_at
            ELSE NULL
          END as completion_date
        FROM orders 
        WHERE archived_at IS NULL 
        AND status IN ('delivered', 'cancelled')
        AND (
          (status = 'delivered' AND (
            (delivered_at IS NOT NULL AND delivered_at < DATE_SUB(NOW(), INTERVAL 1 YEAR))
            OR (delivered_at IS NULL AND created_at < DATE_SUB(NOW(), INTERVAL 1 YEAR))
          ))
          OR (status = 'cancelled' AND created_at < DATE_SUB(NOW(), INTERVAL 1 YEAR))
        )
        ORDER BY created_at ASC
      `);

      if (ordersToArchive.length === 0) {
        console.log('ℹ️  No orders found that need archiving');
        results.success = true;
        return results;
      }

      console.log(`📦 Found ${ordersToArchive.length} orders to archive`);

      // Archive each order
      for (const order of ordersToArchive) {
        try {
          const archiveDate = order.completion_date || order.created_at;
          
          await connection.execute(`
            UPDATE orders 
            SET archived_at = ? 
            WHERE id = ?
          `, [archiveDate, order.id]);

          results.archivedCount++;
          results.details.push({
            id: order.id,
            order_number: order.order_number,
            status: order.status,
            completion_date: order.completion_date,
            archived_at: archiveDate
          });

          console.log(`✅ Archived order #${order.order_number} (${order.status})`);
        } catch (error) {
          const errorMsg = `Failed to archive order #${order.order_number}: ${error.message}`;
          console.error(`❌ ${errorMsg}`);
          results.errors.push(errorMsg);
        }
      }

      results.success = true;
      console.log(`✅ Successfully archived ${results.archivedCount} orders`);

    } catch (error) {
      const errorMsg = `Order archiving failed: ${error.message}`;
      console.error(`❌ ${errorMsg}`);
      results.errors.push(errorMsg);
    } finally {
      if (connection) {
        await connection.end();
      }
    }

    return results;
  }

  /**
   * Delete archived orders that are older than 3 years
   * This permanently removes orders and their associated data
   */
  async deleteOldArchivedOrders() {
    let connection;
    const results = {
      success: false,
      deletedCount: 0,
      deletedOrderItems: 0,
      errors: [],
      details: []
    };

    try {
      connection = await this.getConnection();
      
      console.log('🗑️  Starting automatic deletion of old archived orders...');
      
      // Find archived orders older than 3 years
      const [ordersToDelete] = await connection.execute(`
        SELECT 
          id, 
          order_number, 
          status, 
          archived_at,
          created_at
        FROM orders 
        WHERE archived_at IS NOT NULL 
        AND archived_at < DATE_SUB(NOW(), INTERVAL 3 YEAR)
        ORDER BY archived_at ASC
      `);

      if (ordersToDelete.length === 0) {
        console.log('ℹ️  No archived orders found that need deletion');
        results.success = true;
        return results;
      }

      console.log(`🗑️  Found ${ordersToDelete.length} archived orders to delete`);

      // Delete each order and its associated data
      for (const order of ordersToDelete) {
        try {
          // Start transaction
          await connection.beginTransaction();

          // Delete order items first (due to foreign key constraints)
          const [orderItemsResult] = await connection.execute(`
            DELETE FROM order_items WHERE order_id = ?
          `, [order.id]);

          // Delete delivery notifications
          await connection.execute(`
            DELETE FROM delivery_notifications WHERE order_id = ?
          `, [order.id]);

          // Delete notification views
          await connection.execute(`
            DELETE FROM notification_views WHERE order_id = ?
          `, [order.id]);

          // Delete the order itself
          await connection.execute(`
            DELETE FROM orders WHERE id = ?
          `, [order.id]);

          // Commit transaction
          await connection.commit();

          results.deletedCount++;
          results.deletedOrderItems += orderItemsResult.affectedRows;
          results.details.push({
            id: order.id,
            order_number: order.order_number,
            status: order.status,
            archived_at: order.archived_at,
            deleted_order_items: orderItemsResult.affectedRows
          });

          console.log(`✅ Deleted order #${order.order_number} and ${orderItemsResult.affectedRows} order items`);
        } catch (error) {
          // Rollback transaction on error
          await connection.rollback();
          
          const errorMsg = `Failed to delete order #${order.order_number}: ${error.message}`;
          console.error(`❌ ${errorMsg}`);
          results.errors.push(errorMsg);
        }
      }

      results.success = true;
      console.log(`✅ Successfully deleted ${results.deletedCount} orders and ${results.deletedOrderItems} order items`);

    } catch (error) {
      const errorMsg = `Order deletion failed: ${error.message}`;
      console.error(`❌ ${errorMsg}`);
      results.errors.push(errorMsg);
    } finally {
      if (connection) {
        await connection.end();
      }
    }

    return results;
  }

  /**
   * Run both archiving and deletion processes
   */
  async runMaintenanceTasks() {
    console.log('🚀 Starting order maintenance tasks...');
    console.log('📅 Current time:', new Date().toISOString());
    
    const results = {
      archiving: null,
      deletion: null,
      startTime: new Date(),
      endTime: null,
      totalDuration: null
    };

    // Run archiving
    results.archiving = await this.archiveCompletedOrders();
    
    // Run deletion
    results.deletion = await this.deleteOldArchivedOrders();
    
    results.endTime = new Date();
    results.totalDuration = results.endTime - results.startTime;

    // Summary
    console.log('\n📊 Maintenance Summary:');
    console.log(`⏰ Duration: ${results.totalDuration}ms`);
    console.log(`📦 Orders archived: ${results.archiving.archivedCount}`);
    console.log(`🗑️  Orders deleted: ${results.deletion.deletedCount}`);
    console.log(`📄 Order items deleted: ${results.deletion.deletedOrderItems}`);
    
    if (results.archiving.errors.length > 0 || results.deletion.errors.length > 0) {
      console.log(`❌ Total errors: ${results.archiving.errors.length + results.deletion.errors.length}`);
    }

    return results;
  }

  /**
   * Get statistics about orders and archiving
   */
  async getArchivingStats() {
    let connection;
    
    try {
      connection = await this.getConnection();
      
      const [stats] = await connection.execute(`
        SELECT 
          COUNT(*) as total_orders,
          COUNT(CASE WHEN archived_at IS NOT NULL THEN 1 END) as archived_orders,
          COUNT(CASE WHEN status IN ('delivered', 'cancelled') AND archived_at IS NULL THEN 1 END) as completed_not_archived,
          COUNT(CASE WHEN status NOT IN ('delivered', 'cancelled') THEN 1 END) as active_orders,
          COUNT(CASE WHEN archived_at IS NOT NULL AND archived_at < DATE_SUB(NOW(), INTERVAL 3 YEAR) THEN 1 END) as ready_for_deletion,
          COUNT(CASE WHEN status IN ('delivered', 'cancelled') AND archived_at IS NULL AND 
            ((status = 'delivered' AND (delivered_at < DATE_SUB(NOW(), INTERVAL 1 YEAR) OR (delivered_at IS NULL AND created_at < DATE_SUB(NOW(), INTERVAL 1 YEAR))))
             OR (status = 'cancelled' AND created_at < DATE_SUB(NOW(), INTERVAL 1 YEAR))) THEN 1 END) as ready_for_archiving
        FROM orders
      `);

      return stats[0];
    } catch (error) {
      console.error('❌ Failed to get archiving stats:', error.message);
      return null;
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }
}

module.exports = OrderArchivingService;