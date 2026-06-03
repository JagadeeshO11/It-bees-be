# ITBEES Global — Deployment Guide

## 1. Prerequisites
- Node.js 18+
- Neon PostgreSQL Account
- Razorpay Account
- SMTP Service (e.g., Gmail App Password or Mailtrap)

## 2. Database Setup
1. Create a new project on [Neon](https://neon.tech).
2. Copy the `DATABASE_URL`.
3. In `abc-be`, run:
   ```bash
   npx prisma generate
   npx prisma migrate dev --name init
   npm run seed
   ```

## 3. Environment Configuration
Create a `.env` file based on `.env.example`:
- Set `DATABASE_URL`.
- Set `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`.
- Set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`.
- Set SMTP credentials for `Nodemailer`.
- Set `FRONTEND_URL` (e.g., `https://abc-gamma-ten.vercel.app`).

## 4. Backend Deployment (Render/Railway)
1. Connect your repository.
2. Set the **Build Command**: `npm install && npx prisma generate`.
3. Set the **Start Command**: `node index.js`.
4. Add all environment variables to the platform's dashboard.

## 5. Frontend Deployment (Vercel)
1. Add `VITE_API_URL` environment variable pointing to your deployed backend (e.g., `https://itbees-api.onrender.com/api`).
2. Deploy as usual.

## 6. Security Checklist
- Ensure `uploads/` folder is protected or moved to S3 in high-traffic scenarios.
- Verify `CORS` origin is strictly set to your production frontend URL.
- Use a strong, unique `JWT_REFRESH_SECRET`.
