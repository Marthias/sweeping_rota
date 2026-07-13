# Railway Deployment Guide

## Prerequisites
- GitHub account with your repository pushed
- Railway account (sign up at https://railway.app)

## Step-by-Step Deployment

### 1. Connect Railway to GitHub
1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Click "New Project" → "Deploy from GitHub repo"
3. Connect your GitHub account and authorize Railway
4. Select repository: `https://github.com/Marthias/sweeping_rota.git`

### 2. Create MySQL Database
1. In Railway dashboard, click "Add a service"
2. Select "MySQL" from the marketplace
3. Wait for the database to be provisioned
4. Note the connection details (will be auto-injected as variables)

### 3. Set Environment Variables
In Railway project settings, add these variables:

```
NODE_ENV=production
PORT=3000
DB_HOST=${{ MYSQLHOST }}
DB_PORT=${{ MYSQLPORT }}
DB_USER=${{ MYSQLUSER }}
DB_PASSWORD=${{ MYSQLPASSWORD }}
DB_NAME=${{ MYSQLDATABASE }}
JWT_SECRET=0lclCfHq1mwoNVQWaPQ8T9xhu7xsSKfMXNPnhIR2A04=
```

### 4. Deploy
1. Push your code to GitHub
2. Railway will automatically detect `railway.json` and `Procfile`
3. Deployment will start automatically
4. Monitor logs in Railway dashboard

## Database Setup
After deployment, you need to create tables in production MySQL:

```sql
CREATE DATABASE IF NOT EXISTS sweeping_rota;

USE sweeping_rota;

CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE rotas (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    assigned_date DATE NOT NULL,
    status ENUM('pending', 'completed', 'skipped') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE swept_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    swept_date DATE NOT NULL,
    time_swept TIME,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

## Troubleshooting

### Connection Failed
- Verify database credentials in Railway dashboard
- Check that MySQL service is running
- Ensure IP is whitelisted (Railway handles this automatically)

### Port Issues
- Railway automatically assigns a port; don't hardcode it
- Use `process.env.PORT` in your app (already done)

### Logs
- Check Railway dashboard for real-time logs
- Look for database connection errors
- Verify environment variables are set correctly

## Production URLs
After deployment, Railway provides you with a URL like:
`https://your-app.railway.app`

Update your frontend API calls to use this production URL if needed.

## Redeployment
- Any push to `main` branch will trigger automatic redeployment
- Monitor the deployment in Railway dashboard
