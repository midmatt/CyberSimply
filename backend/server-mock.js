const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3001;
const MIN_DONATION_AMOUNT = 3.00;

// Mock data storage (in-memory for testing)
const donors = new Map();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Buy Me a Coffee webhook endpoint
app.post('/api/bmc-webhook', async (req, res) => {
  try {
    console.log('Received BMC webhook:', JSON.stringify(req.body, null, 2));
    
    const { type, data } = req.body;
    
    // Only process new donation events
    if (type !== 'new_donation') {
      console.log('Ignoring non-donation event:', type);
      return res.status(200).json({ message: 'Event ignored' });
    }
    
    const { email, amount, currency, supporter_name } = data;
    
    if (!email) {
      console.error('No email provided in donation data');
      return res.status(400).json({ error: 'Email is required' });
    }
    
    // Convert amount to USD if needed
    let amountUSD = parseFloat(amount);
    if (currency && currency !== 'USD') {
      console.log(`Donation in ${currency}: ${amount}, assuming USD`);
    }
    
    console.log(`Processing donation: ${email} - $${amountUSD}`);
    
    // Check if donor already exists
    const existingDonor = donors.get(email);
    
    let totalDonated = amountUSD;
    let isAdFree = amountUSD >= MIN_DONATION_AMOUNT;
    
    if (existingDonor) {
      // Update existing donor
      totalDonated = existingDonor.total_donated + amountUSD;
      isAdFree = totalDonated >= MIN_DONATION_AMOUNT;
      
      donors.set(email, {
        email: email,
        total_donated: totalDonated,
        isAdFree: isAdFree,
        supporter_name: supporter_name || existingDonor.supporter_name,
        created_at: existingDonor.created_at,
        updated_at: new Date().toISOString()
      });
      
      console.log(`Updated donor ${email}: $${totalDonated} total, ad-free: ${isAdFree}`);
    } else {
      // Create new donor
      donors.set(email, {
        email: email,
        total_donated: totalDonated,
        isAdFree: isAdFree,
        supporter_name: supporter_name || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
      console.log(`Created new donor ${email}: $${totalDonated} total, ad-free: ${isAdFree}`);
    }
    
    res.status(200).json({ 
      success: true, 
      message: 'Donation processed',
      totalDonated,
      isAdFree
    });
    
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Check ad-free status endpoint
app.get('/api/check-adfree', async (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({ error: 'Email parameter is required' });
    }
    
    console.log(`Checking ad-free status for: ${email}`);
    
    const donor = donors.get(email);
    
    if (!donor) {
      // No donor found
      return res.status(200).json({ isAdFree: false, totalDonated: 0 });
    }
    
    res.status(200).json({ 
      isAdFree: donor.isAdFree || false,
      totalDonated: donor.total_donated || 0
    });
    
  } catch (error) {
    console.error('Check ad-free error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get donor stats endpoint (for admin/debugging)
app.get('/api/donor-stats', async (req, res) => {
  try {
    const donorList = Array.from(donors.values());
    
    const totalDonors = donorList.length;
    const adFreeDonors = donorList.filter(d => d.isAdFree).length;
    const totalRevenue = donorList.reduce((sum, d) => sum + (d.total_donated || 0), 0);
    
    res.status(200).json({
      totalDonors,
      adFreeDonors,
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      donors: donorList.map(d => ({
        email: d.email,
        totalDonated: d.total_donated,
        isAdFree: d.isAdFree,
        createdAt: d.created_at
      }))
    });
    
  } catch (error) {
    console.error('Donor stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 Mock Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`☕ BMC Webhook: http://localhost:${PORT}/api/bmc-webhook`);
  console.log(`🔍 Check Ad-Free: http://localhost:${PORT}/api/check-adfree?email=test@example.com`);
  console.log(`📈 Donor Stats: http://localhost:${PORT}/api/donor-stats`);
  console.log(`💰 Min donation for ad-free: $${MIN_DONATION_AMOUNT}`);
  console.log(`\n🧪 This is a MOCK server for testing. No real database required!`);
});
