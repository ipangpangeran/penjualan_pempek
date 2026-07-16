# Pempek Ikan No Terigu (Gluten Free) - Bookkeeping Web Application

A modern, responsive, and lightweight bookkeeping full-stack web application designed for managing sales, reseller fee-sharing logs, invoicing, and reporting for **Pempek Ikan No Terigu (Gluten Free)**.

## Technical Stack

- **Frontend:** React + Vite + TailwindCSS + Recharts (Inter font, Lucide icons, clean responsive layout)
- **Backend:** Node.js + Express (ES Modules)
- **ORM:** Prisma ORM
- **Database:** SQLite
- **Authentication:** JWT (JSON Web Tokens) with route guard middlewares
- **Password Security:** bcrypt hashing (using `bcryptjs`)

---

## Folder Structure

```
apps-jualan/
├── backend/
│   ├── prisma/
│   │   ├── dev.db             # SQLite Database file (auto-generated)
│   │   ├── schema.prisma      # Prisma schema file defining DB tables
│   │   └── seed.js            # Initial database seed script
│   ├── src/
│   │   ├── controllers/       # API endpoint route logic
│   │   ├── middleware/        # Route authentication & logging middlewares
│   │   ├── routes/            # API routing specifications
│   │   ├── utils/             # Database connection clients
│   │   └── server.js          # Express server entry point
│   ├── package.json
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── components/        # Sidebar Layout, Modal, UI elements
│   │   ├── context/           # Auth and Toast context providers
│   │   ├── pages/             # Dashboard, Login, Inputs, Reports, catalog
│   │   ├── utils/             # API clients, rupiah & date formatters
│   │   ├── App.jsx            # Main route mounting point
│   │   └── main.jsx
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── index.html
│   └── package.json
├── README.md
```

---

## Installation & Running Locally

### Prerequisites

- [Node.js](https://nodejs.org/) (v16.x or newer)
- npm (Node Package Manager)

### Step 1: Run the Backend

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install the backend node modules:
   ```bash
   npm install
   ```
3. Run the database migrations (creates SQLite `dev.db` file):
   ```bash
   npx prisma migrate dev --name init
   ```
4. Run the database seed script (populates initial items and admin account):
   ```bash
   npm run seed
   ```
5. Start the Express API server:
   ```bash
   npm start
   ```
   *The server starts on `http://localhost:5000`.*

### Step 2: Run the Frontend

1. Open a new terminal window and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install the frontend dependencies:
   ```bash
   npm install
   ```
3. Start the Vite React development server:
   ```bash
   npm run dev
   ```
   *The client starts on `http://localhost:5173`.*

---

## Administrator Login Credentials

Open `http://localhost:5173` in your web browser. Log in with:

- **Username:** `ipangpangeran`
- **Password:** `ingatmati`

---

## Maintenance & Database Utilities

### 1. Database Backup
You can download a full backup copy of your database file anytime.
1. Navigate to **Pengaturan & DB** page on the sidebar.
2. Click the **Backup** button in the "Pemeliharaan Database" card.
3. Your browser will download a file named `pempek_gf_backup_YYYY-MM-DD.db`.

### 2. Database Restore
To restore data or recover your bookkeeping book from a previous backup file:
1. Navigate to **Pengaturan & DB** page on the sidebar.
2. In the "Pulihkan dari File Backup" card, select your `.db` backup file.
3. Click the **Restore** button and confirm.
4. The system will overwrite the database file and automatically reload your session.

### 3. Audit Log
Every administrative action (e.g. logging in, entering sales, altering product prices, performing database maintenance) is recorded inside the system **Audit Log**. You can search, review, and paginate logs from the bottom of the **Pengaturan & DB** page.

### 4. Excel & PDF Exports
- **Excel (.xlsx):** Navigate to the **Laporan Penjualan** page. Set your date range filters and click the **Excel** button. This downloads a sheet containing three tabs: Summary, Lapak Ipang eceran logs, and Reseller aggregated rekap tables.
- **PDF (.pdf):** In the **Laporan Penjualan** page, click the **PDF** button. This compiles a beautifully styled document with title, summaries, eceran, and reseller grids.
