# Affiliate++ (MERN)

Affiliate++ is a full-stack MERN application for managing affiliate links, tracking click analytics, and handling subscription/credit payments. The repository contains two top-level apps:

- **Backend**: `mern-project-server` (Express + MongoDB + JWT auth + Razorpay payments)
- **Frontend**: `mern_project_1` (React + Vite + MUI/Tailwind UI)

---

## Repository Layout

```
/
├── mern-project-server/   # Express API + MongoDB + auth + payments
└── mern_project_1/        # React (Vite) UI
```

---

## Features at a Glance

### Backend (Express)
- JWT-based authentication with refresh tokens and Google OAuth support.
- Role-based access control middleware for protected routes.
- Affiliate link CRUD, redirect tracking, and analytics endpoints.
- Razorpay integration for credit packs and subscriptions.
- Email service support for password reset flows.

### Frontend (React)
- Authentication flows (login, register, Google auth, password reset).
- Link dashboard for creating, updating, deleting, and sharing links.
- Analytics dashboard for click metrics.
- User management UI with RBAC.
- Purchase credits / subscription UI for Razorpay payments.

---

## Tech Stack

**Backend**
- Node.js, Express
- MongoDB + Mongoose
- JWT auth + cookies
- Razorpay payments
- Nodemailer for email

**Frontend**
- React + Vite
- MUI + Tailwind
- Redux Toolkit
- Chart.js for analytics

---

## Getting Started

### 1) Clone the repo
```bash
git clone <your-repo-url>
cd Affiliate
```

### 2) Backend setup (`mern-project-server`)
```bash
cd mern-project-server
npm install
```

Create a `.env` file:
```bash
MONGO_URI=your_mongodb_connection_string
CLIENT_ENDPOINT=http://localhost:5173
JWT_SECRET=your_jwt_secret
JWT_REFRESH_TOKEN_SECRET=your_refresh_secret
GOOGLE_CLIENT_ID=your_google_oauth_client_id

RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret
RAZORPAY_YEARLY_PLAN_ID=your_yearly_plan_id
RAZORPAY_MONTHLY_PLAN_ID=your_monthly_plan_id

GMAIL_HOST=smtp.gmail.com
GMAIL_EMAIL_ID=your_email@gmail.com
GMAIL_APP_PASSWORD=your_gmail_app_password
NODE_ENV=development
```

Start the server:
```bash
node server.js
```

The API listens on **http://localhost:5001**.

### 3) Frontend setup (`mern_project_1`)
```bash
cd ../mern_project_1
npm install
```

Create a `.env` file:
```bash
VITE_SERVER_ENDPOINT=http://localhost:5001
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id
VITE_RAZORPAY_KEY_ID=your_razorpay_key_id
```

Start the UI:
```bash
npm run dev
```

The Vite dev server runs on **http://localhost:5173** by default.

---

## API Overview (Backend)

Base URL: `http://localhost:5001`

### Auth
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `POST /auth/google-auth`
- `POST /auth/send-reset-password-token`
- `POST /auth/reset-password`

### Links
- `GET /links` (list)
- `POST /links` (create)
- `GET /links/:id` (detail)
- `PUT /links/:id` (update)
- `DELETE /links/:id` (delete)
- `GET /links/r/:id` (redirect + tracking)
- `POST /links/analytics`

### Users
- `GET /users`
- `POST /users`
- `PUT /users/:id`
- `DELETE /users/:id`

### Payments
- `POST /payments/create-order`
- `POST /payments/verify-order`
- `POST /payments/create-subscription`
- `POST /payments/verify-subscription`
- `POST /payments/cancel-subscription`
- `POST /payments/webhook` (Razorpay webhook)

---

## Scripts

**Backend (`mern-project-server`)**
- `npm test` (placeholder)

**Frontend (`mern_project_1`)**
- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm run lint`

---

## Notes

- Ensure `CLIENT_ENDPOINT` on the backend matches the frontend URL so cookies and CORS work correctly.
- The backend expects MongoDB and Razorpay credentials before payment flows can function.
- Google OAuth requires matching client IDs in both server and client env files.

---

## License

This repository includes an MIT license in the backend subproject (`mern-project-server/LICENSE`).
