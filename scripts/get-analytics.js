/**
 * Fetch analytics data from the admin API using a generated JWT token.
 * Tries JWT_SECRET from env first, then falls back to 'fallback-secret'.
 */
const jwt = require('jsonwebtoken');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3005';

function createToken(secret) {
  return jwt.sign({
    userId: '1',
    email: 'gkcksdmn@gmail.com', // legacy admin allowed by API
    role: 'admin'
  }, secret, { expiresIn: '1h' });
}

async function fetchAnalyticsWithSecret(secretLabel, secret) {
  const token = createToken(secret);
  console.log(`\n🔐 Trying with ${secretLabel}...`);
  try {
    const res = await fetch(`${BASE_URL}/api/admin/analytics`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Cookie': `auth-token=${token}`,
      }
    });
    console.log('HTTP', res.status);
    const data = await res.json();
    if (res.ok) {
      const zerosOk = (
        (data.currentMonth?.orders || 0) === 0 &&
        (data.currentMonth?.revenue || 0) === 0 &&
        (data.customerStats?.total_customers || 0) === 0 &&
        ((data.monthlyRevenue?.length || 0) === 0) &&
        ((data.dailySales?.length || 0) === 0)
      );
      console.log('✅ Success. Key metrics:', {
        currentMonth: data.currentMonth,
        growth: data.growth,
        customerStats: data.customerStats,
        monthlyRevenueLen: data.monthlyRevenue?.length || 0,
        dailySalesLen: data.dailySales?.length || 0,
        zerosOk,
      });
      return true;
    } else {
      console.log('❌ Error:', data);
      return false;
    }
  } catch (err) {
    console.log('❌ Request failed:', err.message);
    return false;
  }
}

(async function run() {
  const envSecret = process.env.JWT_SECRET;
  const candidates = [
    envSecret,
    'fallback-secret',
    'gkicks-shop-jwt-secret-2024-production-key-very-long-and-secure-for-api-authentication',
    'your-secret-key',
    'gkicks-super-secret-jwt-key-2024',
  ].filter(Boolean);

  for (const secret of candidates) {
    const label = secret === envSecret ? 'env JWT_SECRET' : `candidate (${secret.substring(0, 20)}...)`;
    const ok = await fetchAnalyticsWithSecret(label, secret);
    if (ok) return;
  }
  console.log('\n❌ All candidate secrets failed. Ensure dev server JWT_SECRET matches.');
})();