# Deployment Guide

## 1. Database (Supabase) – DONE ✅
You have already created the project.
- **Connection String**: Check `server/.env` for the correct formatting (I handled the special characters).
- **Troubleshooting**: If you get "Can't reach database server" (P1001), it's likely an IPv6 issue. Use the **Supabase Transaction Pooler** connection string (Port 6543) from your dashboard, which supports IPv4. For migrations, you may need to temporarily use Port 5432 with the pooler host.

## 2. Backend (Railway or Render)
**Recommended**: Use **Railway** (easiest for Node.js + WebSockets).
1. Isolate the `server` folder (or deploy the root and set Root Directory to `server`).
2. Add Environment Variables:
   - `DATABASE_URL`: (Copy from `server/.env`)
   - `JWT_SECRET`: (Generate a random string)
   - `PORT`: `5000` (or leave empty if Railway assigns one automatically, usually they set `PORT`)
3. **Build Command**: `npm install && npx prisma migrate deploy && npm run build` 
   *(Note: `migrate deploy` applies migrations in production)*
4. **Start Command**: `npm start`

## 3. Frontend (Vercel)
1. Import the `client` folder.
2. Add Environment Variables:
   - `VITE_API_URL`: The URL of your deployed Backend (e.g., `https://wishlist-api.up.railway.app`)
     *(Do NOT include a trailing slash `/`)*
3. **Build Command**: `npm run build`
4. **Output Directory**: `dist`
5. **Install Command**: `npm install`

## 4. Final Sanity Check
- Ensure your `server/.env` `DATABASE_URL` uses the **Supabase Transaction Pooler** (Port 6543) if you encounter connection limit errors, but Port 5432 (Session) works fine for this scale.
- Check that the Frontend can reach the Backend (CORS is configured in `server/src/index.ts` to allow `*` or specific domains).
