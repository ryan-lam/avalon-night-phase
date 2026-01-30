# Deployment Guide

You have two options for deployment:

1.  **Unified (Simplest)**: Everything on Render.
2.  **Split (Your Request)**: Frontend on **Vercel**, Backend on **Render**.

---

## Method 1: Split Deployment (Vercel + Render)

Since Vercel cannot host the persistent game server (WebSockets + Memory), you must host the **Backend** separately.

### Step 1: Deploy Backend (Render)
1.  Push your code to GitHub.
2.  Go to **Render.com** -> New **Web Service**.
3.  Connect your repo.
4.  **Settings**:
    *   **Root Directory**: `server` <--- IMPORTANT
    *   **Build Command**: `npm install`
    *   **Start Command**: `node index.js`
5.  Click **Create**.
6.  **Copy the URL** Render gives you (e.g., `https://avalon-backend.onrender.com`).

### Step 2: Deploy Frontend (Vercel)
1.  Go to **Vercel.com** -> **Add New Project**.
2.  Connect your repo.
3.  **Settings**:
    *   **Root Directory**: `client` <--- IMPORTANT
    *   **Framework Preset**: Create React App (should auto-detect).
    *   **Environment Variables**:
        *   Name: `REACT_APP_SERVER_URL`
        *   Value: `https://avalon-backend.onrender.com` (The URL from Step 1)
4.  Click **Deploy**.

Done! Your Vercel frontend will now talk to your Render backend.

---

## Method 2: Unified Deployment (Render Only)

If you want to host everything in one place for free.

1.  Go to **Render.com** -> New **Web Service**.
2.  **Settings**:
    *   **Root Directory**: `.` (Leave empty)
    *   **Build Command**: `npm run install-all; npm run build`
    *   **Start Command**: `npm run start`
3.  Create.

Render will host both the site and the server.
