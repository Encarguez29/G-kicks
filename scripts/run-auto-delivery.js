#!/usr/bin/env node

/**
 * Auto-Delivery Cron Script
 * 
 * This script can be run by cron jobs or Windows Task Scheduler
 * to automatically process orders for delivery confirmation.
 * 
 * Usage:
 * 1. Set up environment variables (see .env.example)
 * 2. Add to crontab: 0 2 * * * /path/to/node /path/to/this/script
 * 3. Or use Windows Task Scheduler to run this script daily
 * 
 * The script will:
 * - Call the auto-delivery API endpoint
 * - Log results to console and optionally to a file
 * - Handle errors gracefully
 */

const https = require('https')
const http = require('http')
const { URL } = require('url')

// Configuration
const config = {
  // API endpoint (adjust based on your deployment)
  apiUrl: process.env.AUTO_DELIVERY_API_URL || 'http://localhost:3000/api/admin/auto-delivery',
  
  // API key for authentication
  apiKey: process.env.AUTO_DELIVERY_API_KEY || 'auto-delivery-secret-key',
  
  // Timeout in milliseconds
  timeout: 30000,
  
  // Log file path (optional)
  logFile: process.env.AUTO_DELIVERY_LOG_FILE || null
}

async function runAutoDelivery() {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] 🚀 Starting auto-delivery process...`)
  
  try {
    const result = await makeApiRequest()
    
    if (result.success) {
      console.log(`[${timestamp}] ✅ Auto-delivery completed successfully`)
      console.log(`[${timestamp}] 📊 Results:`)
      console.log(`[${timestamp}]    - Total eligible: ${result.totalEligible}`)
      console.log(`[${timestamp}]    - Processed: ${result.processed}`)
      console.log(`[${timestamp}]    - Errors: ${result.errors}`)
      
      if (result.results && result.results.length > 0) {
        console.log(`[${timestamp}] 📦 Processed orders:`)
        result.results.forEach(order => {
          const status = order.status === 'success' ? '✅' : '❌'
          console.log(`[${timestamp}]    ${status} ${order.orderNumber} (${order.daysSinceShipped} days)`)
          if (order.error) {
            console.log(`[${timestamp}]       Error: ${order.error}`)
          }
        })
      }
      
      // Log to file if configured
      if (config.logFile) {
        await logToFile(timestamp, result)
      }
      
    } else {
      console.error(`[${timestamp}] ❌ Auto-delivery failed`)
      process.exit(1)
    }
    
  } catch (error) {
    console.error(`[${timestamp}] ❌ Auto-delivery error:`, error.message)
    process.exit(1)
  }
}

function makeApiRequest() {
  return new Promise((resolve, reject) => {
    const url = new URL(config.apiUrl)
    const isHttps = url.protocol === 'https:'
    const client = isHttps ? https : http
    
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'User-Agent': 'GKicks-Auto-Delivery-Script/1.0'
      },
      timeout: config.timeout
    }
    
    const req = client.request(options, (res) => {
      let data = ''
      
      res.on('data', (chunk) => {
        data += chunk
      })
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data)
          
          if (res.statusCode === 200) {
            resolve(result)
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${result.error || 'Unknown error'}`))
          }
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`))
        }
      })
    })
    
    req.on('error', (error) => {
      reject(new Error(`Request failed: ${error.message}`))
    })
    
    req.on('timeout', () => {
      req.destroy()
      reject(new Error('Request timeout'))
    })
    
    req.end()
  })
}

async function logToFile(timestamp, result) {
  const fs = require('fs').promises
  const path = require('path')
  
  try {
    const logDir = path.dirname(config.logFile)
    await fs.mkdir(logDir, { recursive: true })
    
    const logEntry = {
      timestamp,
      totalEligible: result.totalEligible,
      processed: result.processed,
      errors: result.errors,
      results: result.results
    }
    
    const logLine = JSON.stringify(logEntry) + '\n'
    await fs.appendFile(config.logFile, logLine)
    
  } catch (error) {
    console.warn(`[${timestamp}] ⚠️  Failed to write to log file: ${error.message}`)
  }
}

// Handle process signals gracefully
process.on('SIGINT', () => {
  console.log('\n🛑 Auto-delivery script interrupted')
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('\n🛑 Auto-delivery script terminated')
  process.exit(0)
})

// Run the script
if (require.main === module) {
  runAutoDelivery()
    .then(() => {
      console.log('🎉 Auto-delivery script completed successfully')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Auto-delivery script failed:', error.message)
      process.exit(1)
    })
}

module.exports = { runAutoDelivery }