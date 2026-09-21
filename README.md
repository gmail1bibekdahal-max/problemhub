# ProblemHub — Share Problems, Build Solutions

> **Notice it. Describe it. Share it.**  
> A platform inspired by modern web apps where founders, developers, and creators discover real user problems, propose solutions, and connect opportunities.

---

## ✨ Features

- **Facebook Dark Mode Aesthetic**: Curated color palette (`#18191A`, `#242526`, `#3A3B3C`) with smooth transitions and glassmorphism.
- **Fixed 3-Column Desktop Layout**: Left and right rails remain fixed at `100vh`, while the middle feed scrolls smoothly with hidden scrollbars.
- **100% Responsive on All Dimensions**:
  - **Mobile (<= 860px)**: Slim 56px sticky top app bar with quick-share and profile controls.
  - **Fluid Search & Scrollable Tabs**: Pinned right below the mobile header.
  - **Bottom-Sheet Modals**: Touch-friendly problem sharing and product submission.
- **Mutual Exclusivity Reactions**:
  - Voters can react with **Problem** ("I have this problem too") or **Solution** ("I built/propose a solution").
  - Mutual exclusivity enforced with optimistic UI updates and instant Supabase persistence.
- **7-Line Description Clamping**:
  - Long problem descriptions clamp to max 7 lines with a **See more** / **See less** toggle.
  - Preserves the structured Stats section (**Frequency**, **Time wasted**, **Current solution**, **Impact**) and **Looking for** tags intact.
- **Full Supabase Persistence**:
  - Problems, comments, nested replies, problem/solution votes, saves, and sponsored products synced to PostgreSQL.

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 18+
- pnpm / npm / yarn

### 2. Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Provide your Supabase project credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Database Setup
Run the SQL script provided in `supabase_schema.sql` inside your Supabase SQL Editor to create the required tables and security policies.

### 4. Install Dependencies & Run
```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view ProblemHub.
