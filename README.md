# AlphaPharma CallCenter WhatsApp AI

A Next.js application with Docker for consistent team development.

---

## Prerequisites

Make sure you have these installed before anything else:

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Git](https://git-scm.com/downloads)
- [Node.js 20+](https://nodejs.org/) (for running Prisma commands locally)

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/Tochi5050/AlphaPharma-CallCenter-WhatsApp-AI.git
cd AlphaPharma-CallCenter-WhatsApp-AI
```

### 2. Set up environment variables

Copy the example env file and fill in the values:

```bash
cp .env.example .env
```

Open `.env` and fill in:

```env
DATABASE_URL="postgresql://postgres:yourpassword@db.xxxx.supabase.co:5432/postgres"
```

> Get the connection string from the team lead privately — never commit your `.env` to Git.

### 3. Install dependencies locally (for Prisma commands)

```bash
npm install
```

### 4. Start the development environment

```bash
docker compose up --build
```

> First build takes a while — grab a coffee ☕. Subsequent starts are much faster.

### 5. Open the app

```
http://localhost:3000
```

---

## Daily Development Workflow

### Start your day:

```bash
docker compose up
```

### Stop at end of day:

```bash
docker compose down
```

### Hot reload:

Just save your file (`Ctrl + S`) — changes reflect in the browser automatically. No need to restart Docker.

### When you install a new package:

```bash
npm install <package-name>
git add package.json package-lock.json
git commit -m "add <package-name>"
docker compose up --build
```

> `--build` is only needed when `package.json` changes.

---

## Database (Prisma)

Run these commands in a **separate terminal** while Docker is running:

```bash
# Run migrations
npx prisma migrate dev --name your-migration-name

# Generate Prisma client
npx prisma generate

# Open Prisma Studio (visual database viewer)
npx prisma studio
```

---

## Git Workflow

### Starting a new feature:

```bash
# Always branch off from main
git checkout main
git pull
git checkout -b feature/your-feature-name
```

### Saving your work:

```bash
git add .
git commit -m "describe what you did"
git push origin feature/your-feature-name
```

### Getting your code into main:

1. Push your branch to GitHub
2. Go to the repo on GitHub
3. Click **"Compare & Pull Request"**
4. Make sure it says `base: main ← compare: feature/your-feature-name`
5. Add a description of your changes
6. Request a review from the team lead
7. Once approved, click **"Merge Pull Request"**

### Pulling latest changes from main:

```bash
git checkout main
git pull
git checkout your-branch
git merge main
```

---

## Branch Naming Convention

| Type | Format | Example |
|------|--------|---------|
| Feature | `feature/name` | `feature/auth` |
| Bug fix | `fix/name` | `fix/login-error` |
| Hotfix | `hotfix/name` | `hotfix/crash-on-submit` |

---

## Project Structure

```
├── app/                  # Next.js app directory
├── lib/                  # Utility functions and generated Prisma client
├── prisma/               # Prisma schema and migrations
├── public/               # Static assets
├── components/           # Reusable UI components
├── Dockerfile            # Docker image definition
├── docker-compose.yml    # Docker services configuration
├── .env.example          # Environment variable template
└── README.md             # You are here
```

---

## Troubleshooting

### Port 3000 already in use:

```bash
# Find what's using the port
netstat -ano | findstr :3000

# Kill the process (replace PID with the number you see)
taskkill /PID <PID> /F
```

### Container won't start:

```bash
docker compose down
docker compose up --build
```

### Changes not showing in browser:

```bash
docker compose down
docker compose up
```

### Database connection issues:

- Make sure your `.env` has the correct `DATABASE_URL`
- Check with the team lead for the correct connection string

---

## Tech Stack

| Tool | Purpose |
|------|---------|
| Next.js 16 | Frontend framework |
| TypeScript | Type safety |
| Tailwind CSS | Styling |
| Shadcn UI | UI components |
| Prisma 7 | Database ORM |
| Supabase | PostgreSQL database |
| Docker | Development environment |
| Vercel | Deployment |

---

## Questions?

Reach out to the team lead before pushing directly to `main`. All changes go through Pull Requests.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
