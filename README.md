# WorkOS 🚀

An all-in-one execution platform for startups, business teams, and founders to manage workflows from a single dashboard. 

WorkOS is an extensible Operating System for Workflow Management. It combines the strengths of flexible database management, real-time task tracking, dynamic forms, and automated routines without locking you into a rigid structure.

## ✨ Features

- **Extensible Workspaces & Entities:** Create flexible Workspaces containing unlimited Modules (e.g. Tasks, Projects, Events, Competitions).
- **Dynamic Custom Fields Engine:** Customize your Module schemas on the fly. Supports Text, LongText, Number, Currency, Dropdown, Multi-Select, Progress Bar, Date, and more!
- **Airtable-like Spreadsheet View:** View and edit your dynamic Entities instantly in an editable grid interface.
- **Kanban Task Management:** Drag-and-drop task workflow management integrated seamlessly into your projects.
- **Automation Engine:** Define "Trigger -> Condition -> Action" rules. Send emails, generate default tasks, or create dashboard alerts automatically.
- **Financial Tracking:** Log Expenses and Incomes with automatic Net Profit and ROI calculations.
- **Real-Time Synchronisation:** Work simultaneously with your team. Updates are synced across clients in real-time.
- **Web Scraping Integration:** Paste a competition or event URL (like Devpost or Unstop) and let the backend automatically extract and populate the entity data.
- **Secure File Storage:** Direct upload capabilities to Cloud Storage for all documents and attachments.

## 🛠️ Technology Stack

**Frontend (Client)**
- React.js 19
- TypeScript
- Vite
- Tailwind CSS & ShadCN UI
- React Router & Redux Toolkit
- React Query (TanStack Query)
- Framer Motion

**Backend (Server)**
- Node.js & Express.js
- TypeScript
- Socket.IO (for real-time notifications/events)
- Nodemailer (Email integration)
- Node Cron (Scheduled Tasks)
- Cheerio (Web Scraping)

**Infrastructure (Firebase)**
- Firebase Authentication
- Cloud Firestore (Database)
- Firebase Storage (Files)
- Firebase Admin SDK (Backend privileges)

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or above)
- npm or yarn
- A Firebase Project (with Firestore, Storage, and Auth enabled)

### 1. Clone the repository
```bash
git clone https://github.com/your-username/work-tracker.git
cd work-tracker
```

### 2. Setup Client Environment
1. Navigate to the client directory:
   ```bash
   cd client
   npm install
   ```
2. Create a `.env` file in the `client` root directory based on your Firebase configuration:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

### 3. Setup Server Environment
1. Navigate to the server directory:
   ```bash
   cd ../server
   npm install
   ```
2. Create a `.env` file in the `server` root directory:
   ```env
   PORT=5000
   CLIENT_URL=http://localhost:5173
   
   # Firebase Admin Configuration (For Backend Services)
   FIREBASE_PROJECT_ID=your_project_id
   FIREBASE_CLIENT_EMAIL=your_firebase_admin_client_email
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYourKeyHere\n-----END PRIVATE KEY-----\n"
   ```
   *Note: Ensure `\n` characters are properly formatted inside the string.*

### 4. Running Locally

You will need two terminal windows to run both ends concurrently.

**Terminal 1 (Server):**
```bash
cd server
npm run dev
```

**Terminal 2 (Client):**
```bash
cd client
npm run dev
```

Visit `http://localhost:5173` to view the application.

## 🏗 Architecture

WorkOS utilizes a serverless-heavy architecture utilizing Firebase for Auth, state, and real-time syncing. The Node.js Express server runs asynchronously alongside it to process heavy computational tasks that shouldn't live on the client, such as:
1. Web Scraping parsing.
2. Background Automation Rule evaluation.
3. Sending SMTP Emails.
4. Cron Jobs for daily task deadlines.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
