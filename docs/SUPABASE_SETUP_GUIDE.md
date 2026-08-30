# Supabase Cloud Database Configuration Guide

This guide walks you through setting up **Supabase** as the primary cloud database for the **Syncnode Exchange Engine and API**.

---

## 1. Create a Supabase Project

1. Log in or sign up at [https://supabase.com](https://supabase.com).
2. Click **"New project"**.
3. Fill in:
   - **Name**: `syncnode-exchange` (or your preferred name)
   - **Database Password**: Choose a strong password and save it.
   - **Region**: Choose the region closest to your server / users (e.g. Frankfurt, US East, London).
   - **Pricing Plan**: Free (or Pro).
4. Click **Create new project** and wait ~1 minute for provisioning.

---

## 2. Run Database Schema

1. In your Supabase Dashboard, click on the **SQL Editor** tab in the left sidebar (icon `>_`).
2. Click **"New query"**.
3. Open the schema file [supabase/schema.sql](file:///Users/Akubrecah/Desktop/syncnode/supabase/schema.sql) in this repository and copy all its contents.
4. Paste the SQL code into the Supabase SQL Editor and click **Run** (or `Cmd+Enter` / `Ctrl+Enter`).
5. You will see `Success. No rows returned`.

This automatically creates the following institutional tables:
- `users`: Registered trader accounts, KYC status, 2FA secrets, admin roles.
- `accounts`: User ledger spot/funding balances with multi-asset support.
- `orders`: High-frequency spot orderbook records.
- `trades`: Matched order executions and fee records.
- `deposits`: Real-time blockchain deposit records and confirmations.
- `withdrawals`: Client withdrawal requests and statuses.
- `transfers`: Zero-fee internal user-to-user UID transfers.
- `user_investments`: Yield matrix staking & compounding fund allocations.
- `deposit_addresses`: Admin-managed hot wallet addresses and networks.
- `audit_logs`: Immutable security events and administrative actions.

---

## 3. Obtain Supabase API Keys & Connection URL

In your Supabase Dashboard:
1. Go to **Project Settings** (gear icon ⚙️ at the bottom of the left sidebar).
2. Go to **API**:
   - **Project URL**: `https://<your-project-id>.supabase.co`
   - **anon key** (`public`): Copy this value.
   - **service_role key** (`secret`): Click to reveal and copy this value (used for backend server write access).
3. Go to **Database**:
   - Under **Connection string**, select **URI**.
   - Copy the URI: `postgresql://postgres:[YOUR-PASSWORD]@db.<your-project-id>.supabase.co:5432/postgres`

---

## 4. Set Environment Variables

### A. For Railway (Production Backend)
1. Go to your [Railway Dashboard](https://railway.app).
2. Open your `syncnode` backend service.
3. Click on the **Variables** tab.
4. Add the following environment variables:
   ```env
   SUPABASE_URL=https://<your-project-id>.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<your-service-role-secret-key>
   SUPABASE_KEY=<your-service-role-or-anon-key>
   SUPABASE_DB_URL=postgresql://postgres:<YOUR-PASSWORD>@db.<your-project-id>.supabase.co:5432/postgres
   ```
5. Railway will automatically trigger a zero-downtime redeploy with Supabase connected!

### B. For Local Development
In the project root, create or edit `.env`:
```env
SUPABASE_URL=https://<your-project-id>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-secret-key>
SUPABASE_KEY=<your-service-role-or-anon-key>
```

---

## 5. Verify Supabase Connection

Once deployed, visit your backend health endpoint:
```
https://<your-railway-url>/api/v1/health
```
You will receive:
```json
{
  "status": "HEALTHY",
  "service": "syncnode-python-core",
  "timestamp": 1788100000000,
  "supabase_connected": true,
  "mongo_connected": false
}
```
All users, balances, trades, deposits, and orders will now persist in Supabase cloud PostgreSQL.
