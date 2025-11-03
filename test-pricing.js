// Test script to check pricing calculation
const testPrice = 9000; // Base price from admin (Jordan 4 Retro SB)

console.log('Testing pricing calculation...');
console.log('Base price:', testPrice);

// Test the API endpoint
fetch('http://localhost:3000/api/pricing', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    prices: [testPrice]
  })
})
.then(response => response.json())
.then(data => {
  console.log('API Response:', JSON.stringify(data, null, 2));
  
  if (data.calculatedPrices && data.calculatedPrices[0]) {
    const result = data.calculatedPrices[0];
    console.log('\n=== PRICING BREAKDOWN ===');
    console.log('Base Price:', result.basePrice);
    console.log('Final Price:', result.finalPrice);
    console.log('Admin Fee:', data.settings.adminFee);
    console.log('Markup %:', data.settings.markupPercentage);
    
    // Manual calculation to verify
    const adminFee = data.settings.adminFee || 0;
    const markupPercentage = data.settings.markupPercentage || 0;
    
    console.log('\n=== MANUAL CALCULATION ===');
    console.log('Step 1 - Base + Admin Fee:', testPrice, '+', adminFee, '=', testPrice + adminFee);
    
    const withAdminFee = testPrice + adminFee;
    const withMarkup = withAdminFee * (1 + markupPercentage / 100);
    console.log('Step 2 - Apply Markup:', withAdminFee, '* (1 +', markupPercentage + '%)', '=', withMarkup);
    
    const withVAT = withMarkup * 1.12;
    console.log('Step 3 - Apply 12% VAT:', withMarkup, '* 1.12 =', withVAT);
    
    const finalCalculated = Math.round(withVAT * 100) / 100;
    console.log('Final (rounded):', finalCalculated);
    
    console.log('\n=== COMPARISON ===');
    console.log('Expected (Admin):', '₱13708.80');
    console.log('Calculated (API):', '₱' + result.finalPrice);
    console.log('Manual calc:', '₱' + finalCalculated);
  }
})
.catch(error => {
  console.error('Error:', error);
});