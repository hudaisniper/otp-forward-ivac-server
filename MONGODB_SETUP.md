# MongoDB Atlas Configuration for Vercel Deployment

## Changes Made to Fix Timeout Error

### 1. Connection Caching

- Implemented connection caching for serverless environments
- Reuses existing connections instead of creating new ones on each request

### 2. Optimized Mongoose Settings

- `bufferCommands: false` - Fails fast instead of buffering operations
- `serverSelectionTimeoutMS: 5000` - Reduced timeout for faster failure detection
- `maxPoolSize: 10` - Optimized connection pool
- Connection state checking before each API request

### 3. Middleware Protection

- Added middleware to ensure database connection before handling API requests
- Returns proper 503 error if database is unavailable

## Required MongoDB Atlas Configuration

### ✅ Network Access (CRITICAL)

1. Go to MongoDB Atlas Dashboard
2. Navigate to **Network Access** (Security section)
3. Click **Add IP Address**
4. Select **Allow Access from Anywhere** (0.0.0.0/0)
    - Required because Vercel uses dynamic IPs
    - Alternative: Add specific Vercel IP ranges (more secure but complex)

### ✅ Database User

1. Go to **Database Access**
2. Ensure your user has **Read and Write** permissions
3. Verify the username and password in your connection string

### ✅ Connection String Format

Your `MONGODB_URI` should look like:

```
mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority
```

⚠️ **Replace with your actual values:**

- `<username>` - Your database username
- `<password>` - Your database password (URL encoded if contains special characters)
- `<cluster>` - Your cluster name
- `<database>` - Your database name

### ✅ Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add/verify:
    - `MONGODB_URI` - Your full MongoDB connection string
    - `PORT` - 3000 (or your preferred port)

## Testing Connection

After deployment, test the endpoints:

```bash
# Health check
curl https://your-vercel-domain.vercel.app/

# Test message creation
curl -X POST https://your-vercel-domain.vercel.app/api/messages \
  -H "Content-Type: application/json" \
  -d '{
    "from": "test",
    "text": "test message",
    "sentStamp": "2024-01-01",
    "receivedStamp": "2024-01-01",
    "sim": "SIM1"
  }'
```

## Troubleshooting

### Still getting timeout errors?

1. **Check MongoDB Atlas Status** - Ensure cluster is not paused
2. **Verify IP Whitelist** - Must allow 0.0.0.0/0 for Vercel
3. **Check Connection String** - No typos, password URL-encoded
4. **View Vercel Logs** - Check for specific error messages
5. **MongoDB Atlas Logs** - Check connection attempts

### Common Issues:

- **Connection string has special characters** → URL encode the password
- **Free tier cluster paused** → Unpause or upgrade
- **Wrong database name** → Verify database exists
- **Firewall rules** → IP whitelist not configured

## Performance Notes

- First request after cold start may be slower (1-3 seconds)
- Subsequent requests use cached connection (fast)
- Connection automatically reconnects if dropped
- 10-second maximum function duration (configurable in vercel.json)

## Security Recommendations

For production:

1. Use strong database passwords
2. Enable MongoDB Atlas audit logs
3. Rotate credentials regularly
4. Monitor unusual connection patterns
5. Consider using Vercel-specific IP ranges instead of 0.0.0.0/0
