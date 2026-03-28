# Production Deployment Guide

Deploying **1b4h** is easiest when split into two services: the Frontend (Vite/React) on **Vercel** and the Backend (Node.js/Socket.io) on **Render**.

---

## 1. Deploying the Backend (Render)

Render provides native WebSocket support, making it perfect for Socket.io.

1. Create an account on [Render.com](https://render.com).
2. Click **New +** -> **Web Service**.
3. Connect your GitHub repository.
4. Set the following configuration:
   - **Root Directory**: \`backend\`
   - **Environment**: \`Node\`
   - **Build Command**: \`npm install\`
   - **Start Command**: \`npm start\` (or \`node index.js\`)
5. Under **Environment Variables**, add:
   - \`GROQ_API_KEY\`: (Your actual Groq API key)
6. Click **Create Web Service**. 
7. Once deployed, copy your backend URL (e.g., \`https://1b4h-backend.onrender.com\`).

---

## 2. Deploying the Frontend (Vercel)

Vercel is the fastest way to host Vite applications.

1. Go to [Vercel.com](https://vercel.com) and click **Add New -> Project**.
2. Import your GitHub repository.
3. In the project setup:
   - **Root Directory**: \`frontend\`
   - **Framework Preset**: \`Vite\`
   - **Build Command**: \`npm run build\`
   - **Output Directory**: \`dist\`
4. Under **Environment Variables**, add the URL of your deployed Render backend:
   - \`VITE_BACKEND_URL\`: (e.g., \`https://1b4h-backend.onrender.com\`)
5. Click **Deploy**.

---

## How It Works

The frontend code uses Vite's environment variables to determine where to connect the WebSocket. 

- During local development, it falls back to \`http://localhost:3001\`.
- In production, it reads the \`VITE_BACKEND_URL\` you configured on Vercel and connects seamlessly to your cloud backend.
