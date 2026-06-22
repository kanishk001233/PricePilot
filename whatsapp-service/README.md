# PricePilot WhatsApp Microservice

A standalone, persistent Express-based microservice that handles WhatsApp Web authentication and receipt dispatches via `whatsapp-web.js` and `puppeteer`. Designed to be deployed on a persistent server (like AWS EC2, Render, or Railway) and communicate with a serverless frontend (like AWS Amplify or Vercel).

---

## Files in this Repository

1. **`server.js`**: Main entrypoint implementing the Express API (running on port `3001` by default).
2. **`package.json`**: Package specifications and dependencies.
3. **`.gitignore`**: Excludes dependencies, logs, and sensitive session credentials (`.wwebjs_auth/`).
4. **`.env`**: Local environment configuration file (not committed to Git).

---

## Local Setup & Installation

1. Copy the files of this folder into a new folder on your computer.
2. Open your terminal in the new folder.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Create a `.env` file in the root of this folder:
   ```ini
   PORT=3001
   
   # Optional: Path to custom Chromium/Chrome binary (required on some Linux VPS environments)
   # CHROME_PATH=/usr/bin/chromium-browser
   ```
5. Run in development mode:
   ```bash
   npm run dev
   ```
6. The service will boot up and be accessible locally at `http://localhost:3001`.

---

## How to Initialize & Push to a New GitHub Repository

To host this as a completely separate GitHub repository, open PowerShell/Command Prompt in your new standalone folder and run:

```powershell
# 1. Initialize a empty git repository
git init

# 2. Add all files
git add .

# 3. Commit the files
git commit -m "Initial commit of WhatsApp microservice"

# 4. Create main branch
git branch -M main

# 5. Link your new GitHub repository URL
git remote add origin YOUR_NEW_GITHUB_REPO_URL

# 6. Push to GitHub
git push -u origin main
```
