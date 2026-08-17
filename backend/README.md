# CyberSafe News Backend API

This backend API handles Buy Me a Coffee webhook integration and ad-free status management for the CyberSafe News app.

## Features

- **Buy Me a Coffee Webhook**: Receives donation events and updates donor status
- **Ad-Free Status Check**: API endpoint to verify if a user has ad-free access
- **Supabase Integration**: Stores donor data and donation history
- **Donor Statistics**: Admin endpoint to view donation analytics

## Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Environment Variables

Copy `env.example` to `.env` and fill in your values:

```bash
cp env.example .env
```

Required environment variables:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key
- `BMC_WEBHOOK_SECRET`: Your Buy Me a Coffee webhook secret (optional)
- `MIN_DONATION_AMOUNT`: Minimum donation for ad-free access (default: 5.00)

### 3. Database Setup

Run the SQL schema in your Supabase SQL editor:

```sql
-- Copy and paste the contents of supabase-schema.sql
```

### 4. Start the Server

```bash
# Development
npm run dev

# Production
npm start
```

The server will start on `http://localhost:3001`

## API Endpoints

### Health Check
- **GET** `/health` - Server health status

### Buy Me a Coffee Webhook
- **POST** `/api/bmc-webhook` - Receives donation events from BMC
  - Body: BMC webhook payload
  - Response: `{ success: boolean, message: string, totalDonated: number, isAdFree: boolean }`

### Ad-Free Status Check
- **GET** `/api/check-adfree?email=user@example.com` - Check if user has ad-free access
  - Response: `{ isAdFree: boolean, totalDonated: number }`

### Donor Statistics (Admin)
- **GET** `/api/donor-stats` - Get donation analytics
  - Response: `{ totalDonors: number, adFreeDonors: number, totalRevenue: number, donors: array }`

## Buy Me a Coffee Integration

### 1. Set up Webhook

1. Go to your Buy Me a Coffee dashboard
2. Navigate to Settings > Webhooks
3. Add a new webhook with URL: `https://your-domain.com/api/bmc-webhook`
4. Select event type: `new_donation`
5. Copy the webhook secret to your `.env` file

### 2. Test with ngrok (Development)

```bash
# Install ngrok
npm install -g ngrok

# Start your server
npm run dev

# In another terminal, expose your local server
ngrok http 3001

# Use the ngrok URL in your BMC webhook settings
# Example: https://abc123.ngrok.io/api/bmc-webhook
```

## Database Schema

### Donors Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| email | TEXT | Donor's email (unique) |
| total_donated | NUMERIC(10,2) | Total amount donated |
| isAdFree | BOOLEAN | Whether user has ad-free access |
| supporter_name | TEXT | Name from BMC (optional) |
| created_at | TIMESTAMP | When record was created |
| updated_at | TIMESTAMP | When record was last updated |

## Error Handling

The API includes comprehensive error handling:
- Invalid email addresses
- Database connection errors
- Webhook validation failures
- Missing required fields

All errors are logged to the console for debugging.

## Security

- CORS enabled for cross-origin requests
- Input validation on all endpoints
- SQL injection protection via Supabase
- Rate limiting recommended for production

## Deployment

### Environment Variables for Production

```bash
NODE_ENV=production
PORT=3001
SUPABASE_URL=your_production_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_production_service_role_key
BMC_WEBHOOK_SECRET=your_bmc_webhook_secret
MIN_DONATION_AMOUNT=5.00
```

### Recommended Hosting Platforms

- **Vercel**: Easy deployment with automatic HTTPS
- **Railway**: Simple Node.js deployment
- **Heroku**: Traditional PaaS with good Node.js support
- **DigitalOcean App Platform**: Cost-effective and reliable

## Testing

### Test Webhook with curl

```bash
# Test donation webhook
curl -X POST http://localhost:3001/api/bmc-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "type": "new_donation",
    "data": {
      "email": "test@example.com",
      "amount": "5.00",
      "currency": "USD",
      "supporter_name": "Test User"
    }
  }'

# Test ad-free check
curl "http://localhost:3001/api/check-adfree?email=test@example.com"
```

## Monitoring

The API logs all requests and errors. For production, consider:
- Adding request logging middleware
- Setting up error monitoring (Sentry, etc.)
- Database query monitoring
- Performance metrics collection

## Support

For issues or questions:
1. Check the logs for error details
2. Verify environment variables are set correctly
3. Test database connectivity
4. Check Buy Me a Coffee webhook configuration
