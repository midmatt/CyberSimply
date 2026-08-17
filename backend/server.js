const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const stripeRoutes = require('./stripe-routes');

const app = express();
const PORT = process.env.PORT || 3001;
const MIN_DONATION_AMOUNT = parseFloat(process.env.MIN_DONATION_AMOUNT) || 5.00;

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Stripe routes
app.use('/api/stripe', stripeRoutes);

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
    
    // Convert amount to USD if needed (BMC typically sends in USD)
    let amountUSD = parseFloat(amount);
    if (currency && currency !== 'USD') {
      // In a real app, you'd want to use a currency conversion API
      console.log(`Donation in ${currency}: ${amount}, assuming USD`);
    }
    
    console.log(`Processing donation: ${email} - $${amountUSD}`);
    
    // Check if donor already exists
    const { data: existingDonor, error: fetchError } = await supabase
      .from('donors')
      .select('*')
      .eq('email', email)
      .single();
    
    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching donor:', fetchError);
      return res.status(500).json({ error: 'Database error' });
    }
    
    let totalDonated = amountUSD;
    let isAdFree = amountUSD >= MIN_DONATION_AMOUNT;
    
    if (existingDonor) {
      // Update existing donor
      totalDonated = existingDonor.total_donated + amountUSD;
      isAdFree = totalDonated >= MIN_DONATION_AMOUNT;
      
      const { error: updateError } = await supabase
        .from('donors')
        .update({
          total_donated: totalDonated,
          isAdFree: isAdFree,
          updated_at: new Date().toISOString()
        })
        .eq('email', email);
      
      if (updateError) {
        console.error('Error updating donor:', updateError);
        return res.status(500).json({ error: 'Database error' });
      }
      
      console.log(`Updated donor ${email}: $${totalDonated} total, ad-free: ${isAdFree}`);
    } else {
      // Create new donor
      const { error: insertError } = await supabase
        .from('donors')
        .insert({
          email: email,
          total_donated: totalDonated,
          isAdFree: isAdFree,
          supporter_name: supporter_name || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      
      if (insertError) {
        console.error('Error creating donor:', insertError);
        return res.status(500).json({ error: 'Database error' });
      }
      
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
    
    const { data: donor, error } = await supabase
      .from('donors')
      .select('isAdFree, total_donated')
      .eq('email', email)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        // No donor found
        return res.status(200).json({ isAdFree: false, totalDonated: 0 });
      }
      console.error('Error fetching donor:', error);
      return res.status(500).json({ error: 'Database error' });
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
    const { data: donors, error } = await supabase
      .from('donors')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching donor stats:', error);
      return res.status(500).json({ error: 'Database error' });
    }
    
    const totalDonors = donors.length;
    const adFreeDonors = donors.filter(d => d.isAdFree).length;
    const totalRevenue = donors.reduce((sum, d) => sum + (d.total_donated || 0), 0);
    
    res.status(200).json({
      totalDonors,
      adFreeDonors,
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      donors: donors.map(d => ({
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
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`☕ BMC Webhook: http://localhost:${PORT}/api/bmc-webhook`);
  console.log(`🔍 Check Ad-Free: http://localhost:${PORT}/api/check-adfree?email=test@example.com`);
  console.log(`📈 Donor Stats: http://localhost:${PORT}/api/donor-stats`);
  console.log(`💰 Min donation for ad-free: $${MIN_DONATION_AMOUNT}`);
});
