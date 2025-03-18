# XRPL EVM Faucet Project

This repository contains two main components:

1. **Faucet Backend (Express + XRPL + Socket.IO + SQLite)**  
2. **XRPL EVM Website (Next.js + Tailwind CSS)**

Below is a high-level overview of each part and how to set it up for **production** usage, with **npm** for the backend and **yarn** for the frontend.

---

## Table of Contents

- [Overview](#overview)
- [Repository Structure](#repository-structure)
- [Faucet Backend](#faucet-backend)
  - [Installation & Setup (npm)](#installation--setup-npm)
  - [Production Build & Run](#production-build--run)
  - [Environment Variables](#environment-variables)
  - [Endpoints](#endpoints)
- [XRPL EVM Website](#xrpl-evm-website)
  - [Installation & Setup (yarn)](#installation--setup-yarn)
  - [Production Build & Run](#production-build--run-1)
  - [Key Components](#key-components)
- [Database](#database)
- [Deployment Tips](#deployment-tips)
- [License](#license)

---

## Overview

**Goal**: Provide a demo faucet that sends test XRP from the XRPL to a sidechain (XRPL EVM) address. The system:

1. **Backend**  
   - Creates ephemeral XRPL wallets.
   - Submits transactions to XRPL.
   - Polls bridging completion on XRPL EVM.
   - Uses a local SQLite database to record transactions.

2. **Frontend**  
   - Provides a React-based UI (Next.js + Tailwind) to connect MetaMask, choose a network, and request test XRP.
   - Displays bridging progress, bridging facts, and final status.

---

## Repository Structure

```
.
├── .gitignore
├── README.md                <-- This file
├── faucet.db                <-- SQLite DB (if generated at root)
├── generate_report.sh
├── project
│   ├── faucet-backend
│   │   ├── .env
│   │   ├── .env.example
│   │   ├── .gitignore
│   │   ├── faucet.db
│   │   ├── package.json
│   │   ├── src
│   │   │   ├── db.ts
│   │   │   ├── index.ts
│   │   │   ├── pollTxStatus.ts
│   │   │   └── transactionTypes.ts
│   │   └── tsconfig.json
│   └── xrpl-evm-website
│       ├── .gitignore
│       ├── .next
│       │   └── ... (Next.js build artifacts)
│       ├── app
│       │   ├── globals.css
│       │   ├── layout.tsx
│       │   └── page.tsx
│       ├── components
│       │   ├── bridging-progress.tsx
│       │   ├── connect-wallet-button.tsx
│       │   ├── external-link.tsx
│       │   ├── faucet.tsx
│       │   ├── footer.tsx
│       │   ├── header.tsx
│       │   ├── icons.tsx
│       │   ├── metamask-button.tsx
│       │   ├── ui
│       │   │   ├── button.tsx
│       │   │   ├── card.tsx
│       │   │   ├── navigation-menu.tsx
│       │   │   └── scroll-animation.tsx
│       ├── lib
│       │   └── utils.ts
│       ├── package.json
│       ├── public
│       │   ├── left.svg
│       │   ├── right.svg
│       │   └── logos
│       ├── tsconfig.json
│       └── yarn.lock
└── repo_report.txt
```

- **faucet-backend**: Node/Express server that handles XRPL + bridging logic.
- **xrpl-evm-website**: Next.js app for the front-end UI.

---

## Faucet Backend

### Installation & Setup (npm)

1. **Navigate** to `project/faucet-backend`.
2. **Install dependencies** using **npm**:
   ```bash
   npm install
   ```
3. **Create a `.env` file** (based on `.env.example`) to specify XRPL URLs, gateway addresses, etc.

### Production Build & Run

While the backend is primarily TypeScript, you can compile and run it with standard Node in production:

```bash
# Build the project
npx tsc

# Run the compiled output (in dist/)
node dist/index.js
```

Or simply run:
```bash
npm run dev
```
if you are comfortable with `ts-node-dev` in production. For a more robust production environment, consider using a process manager like `PM2`:

```bash
npm install pm2 -g
pm2 start dist/index.js --name faucet-backend
```

### Environment Variables

Common `.env` keys:

- `XRPL_TESTNET_URL` = `wss://s.altnet.rippletest.net:51233`
- `TESTNET_GATEWAY_ADDRESS` = `<Your XRPL Testnet gateway address>`
- `XRPL_DEVNET_URL` = `wss://s.devnet.rippletest.net:51233`
- `DEVNET_GATEWAY_ADDRESS` = `<Your XRPL Devnet gateway address>`
- `PORT` = `5005` (or any free port)

### Endpoints

- **`POST /api/faucet`**  
  Body:  
  ```json
  {
    "evmAddress": "0xYourAddress",
    "network": "Testnet" | "Devnet"
  }
  ```
  Returns JSON with `{ "success": true, "txHash": "<hash>" }` if successful.  
  The backend also emits Socket.IO events (`transactionCreated`, `transactionUpdated`) to inform the UI of bridging status.

---

## XRPL EVM Website

### Installation & Setup (yarn)

1. **Navigate** to `project/xrpl-evm-website`.
2. **Install dependencies** using **yarn**:
   ```bash
   yarn install
   ```
3. **Development server**:
   ```bash
   yarn dev
   ```
   The Next.js app will start on port `5089` by default.

### Production Build & Run

For a production build:

```bash
yarn build
yarn start
```

- This compiles the Next.js app and then serves it on port `5089` (by default).
- For advanced production usage, consider hosting on a dedicated service or container.

### Key Components

- **`faucet.tsx`**  
  Main faucet UI, includes Connect Wallet, Add Network, input for EVM address, and bridging request logic.
- **`connect-wallet-button.tsx`**  
  Detects & connects MetaMask, manages user’s connected account state.
- **`metamask-button.tsx`**  
  Button to add XRPL EVM Devnet/Testnet to MetaMask.
- **`bridging-progress.tsx`**  
  Shows bridging spinner and rotating facts while waiting for bridging.
- **`layout.tsx`** / **`page.tsx`**  
  Next.js App Router layout + main page entry.

---

## Database

- Uses **SQLite**.  
- A `faucet.db` file is created in the backend folder.  
- Table: **`transactions`** to store bridging/faucet data:
  ```sql
  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    evmAddress TEXT,
    fractionId REAL,
    xrplTxHash TEXT,
    xrplevmTxHash TEXT,
    amountId REAL,
    xrplTxTime INTEGER,
    xrplevmTxTime INTEGER,
    status TEXT,
    bridgingTimeMs INTEGER,
    destinationTxHash TEXT
  );
  ```

---

## Deployment Tips

1. **Security**:  
   - Store secrets in `.env` or a secure vault.  
   - Consider using HTTPS for your domain, or a reverse proxy (NGINX) for SSL termination.

2. **Process Management**:  
   - Use PM2 or systemd for the backend Node process in production.

3. **Build**:  
   - For the backend, compile TypeScript to JavaScript.  
   - For the frontend, run `yarn build` for an optimized production build.

4. **Scaling**:  
   - The backend is not horizontally scalable out of the box with SQLite. Consider switching to a networked DB for large-scale usage.

---

## License

```
MIT License

Copyright (c) 2023

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the “Software”), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is furnished
to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```