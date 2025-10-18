import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database/mysql'

async function columnExists(table: string, column: string) {
  // Using direct interpolation because some drivers don't parameterize SHOW statements
  const rows = await executeQuery(`SHOW COLUMNS FROM ${table} LIKE '${column}'`) as any[]
  return Array.isArray(rows) && rows.length > 0
}

async function indexExists(table: string, indexName: string) {
  const rows = await executeQuery(`SHOW INDEX FROM ${table} WHERE Key_name = '${indexName}'`) as any[]
  return Array.isArray(rows) && rows.length > 0
}

export async function GET(_req: NextRequest) {
  const changes: string[] = []

  try {
    // 1) Ensure size/color columns are present
    const hasSize = await columnExists('cart_items', 'size')
    const hasColor = await columnExists('cart_items', 'color')

    if (!hasSize) {
      await executeQuery(`ALTER TABLE cart_items ADD COLUMN size VARCHAR(10) NULL AFTER quantity`)
      changes.push('Added column cart_items.size')
    }

    if (!hasColor) {
      await executeQuery(`ALTER TABLE cart_items ADD COLUMN color VARCHAR(50) NULL AFTER size`)
      changes.push('Added column cart_items.color')
    }

    // 2) Ensure a plain index on user_id exists to satisfy FK, then drop the overly-strict unique index
    const hasUserIdIndex = await indexExists('cart_items', 'user_id')
    if (!hasUserIdIndex) {
      await executeQuery(`ALTER TABLE cart_items ADD INDEX user_id (user_id)`)
      changes.push('Added index user_id (user_id) to satisfy FK')
    }

    const hasBadIndex = await indexExists('cart_items', 'unique_user_product')
    if (hasBadIndex) {
      // Temporarily drop FKs to allow index changes, then re-add
      // We discover current FK names dynamically to be safe
      const fkRows = await executeQuery(`SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_NAME='cart_items' AND CONSTRAINT_TYPE='FOREIGN KEY'`) as any[]
      for (const r of fkRows) {
        await executeQuery(`ALTER TABLE cart_items DROP FOREIGN KEY ${r.CONSTRAINT_NAME}`)
        changes.push(`Dropped FK ${r.CONSTRAINT_NAME}`)
      }

      await executeQuery(`ALTER TABLE cart_items DROP INDEX unique_user_product`)
      changes.push('Dropped index unique_user_product (user_id, product_id)')

      // Re-add FKs referencing standalone indexes
      await executeQuery(`ALTER TABLE cart_items ADD CONSTRAINT cart_items_ibfk_1 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`)
      changes.push('Re-added FK cart_items_ibfk_1 (user_id)')
      await executeQuery(`ALTER TABLE cart_items ADD CONSTRAINT cart_items_ibfk_2 FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE`)
      changes.push('Re-added FK cart_items_ibfk_2 (product_id)')
    }

    // 3) Add a correct composite unique index scoped by size and color
    const hasGoodIndex = await indexExists('cart_items', 'unique_user_product_size_color')
    if (!hasGoodIndex) {
      // Note: color may be NULL; MySQL allows multiple NULLs in unique indexes.
      await executeQuery(`ALTER TABLE cart_items ADD UNIQUE KEY unique_user_product_size_color (user_id, product_id, size, color)`)
      changes.push('Added index unique_user_product_size_color (user_id, product_id, size, color)')
    }

    // Dump indexes for inspection
    const indexDump = await executeQuery(`SHOW INDEX FROM cart_items`) as any[]

    // Capture current table definition AFTER changes
    const createTableAfter = await executeQuery(`SHOW CREATE TABLE cart_items`) as any[]
    const createSqlAfter = Array.isArray(createTableAfter) && createTableAfter.length > 0 ? (createTableAfter[0]['Create Table'] || createTableAfter[0]['Create Table']) : ''

    return NextResponse.json({ success: true, changes, createSql: createSqlAfter, indexes: indexDump })
  } catch (error: any) {
    console.error('❌ Fix-cart-schema error:', error)
    return NextResponse.json({ success: false, error: String(error?.message || error) }, { status: 500 })
  }
}