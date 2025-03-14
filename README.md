```md
# XRPL EVM Faucet Project

This repository implements a faucet for the XRPL EVM sidechain. The project consists of two main components:

1. **Faucet Backend:**  
   A Node.js/TypeScript Express API that:
   - Funds an ephemeral XRPL wallet.
   - Submits an XRPL Payment transaction with unique memos for bridging.
   - Polls both the XRPL (source) and the XRPL-EVM (destination) for transaction status.
   - Broadcasts real-time transaction updates via Socket.IO.
   - Records transaction data in a SQLite database.

2. **XRPL EVM Website:**  
   A Next.js application that provides a user interface where users can:
   - Choose between XRPL EVM Devnet and Testnet.
   - Connect MetaMask to add/switch to the selected network.
   - Enter an Ethereum-compatible (0x…) address.
   - Complete required actions (e.g. follow on X, join Discord).
   - Request XRP from the faucet and view transaction status updates.

---

## Repository Structure

```
.
├── generate_report.sh         # Script to generate a repository report (structure and file contents)
├── package.json               # Root package.json (e.g. ethers dependency)
└── project
    ├── faucet-backend       # Faucet backend service
    │   ├── .env             # Environment configuration
    │   ├── .env.example     # Example env configuration
    │   ├── .gitignore       
    │   ├── package.json     
    │   ├── src
    │   │   ├── db.ts            # SQLite DB initialization & connection
    │   │   ├── index.ts         # Express server & API endpoint (POST /api/faucet)
    │   │   ├── pollTxStatus.ts  # Polling logic for XRPL and XRPL-EVM transactions
    │   │   └── transactionTypes.ts  # Functions for submitting XRPL transactions
    │   └── tsconfig.json
    └── xrpl-evm-website     # Frontend website (Next.js)
        ├── .gitignore       
        ├── .next            # Next.js build output
        ├── README.md        # Frontend README (optional)
        ├── app              # Next.js application code
        │   ├── globals.css
        │   ├── layout.tsx
        │   └── page.tsx
        ├── components       # React UI components (faucet, header, footer, etc.)
        ├── lib              # Utility functions (e.g. cn for Tailwind merging)
        ├── public           # Public assets (logos, images)
        ├── package.json     
        ├── tsconfig.json    
        └── ... (other config files)
```

---

## Prerequisites

- **Node.js** v14 or higher
- **npm**, **yarn**, or **pnpm**

---

## Setup Instructions

### Faucet Backend

1. **Navigate to the backend directory:**

   ```bash
   cd project/faucet-backend
   ```

2. **Install dependencies:**

   ```bash
   npm install
   # or
   yarn install
   ```

3. **Configure Environment Variables:**

   - Copy the `.env.example` file to `.env` and update values as needed.
   - An example `.env` file:

     ```ini
     XRPL_TESTNET_URL=wss://s.altnet.rippletest.net:51233
     XRPL_DEVNET_URL=wss://s.devnet.rippletest.net:51233
     TESTNET_GATEWAY_ADDRESS=rsCPY4vwEiGogSraV9FeRZXca6gUBWZkhg
     DEVNET_GATEWAY_ADDRESS=rGAbJZEzU6WaYv5y1LfyN7LBBcQJ3TxsKC
     PORT=3003
     ```

4. **Initialize the Database:**

   - The backend uses SQLite. The database file (`faucet.db`) will be created automatically upon first run.

5. **Start the Backend Server:**

   ```bash
   npm run dev
   # or
   yarn dev
   ```

   The server will listen on [http://localhost:3003](http://localhost:3003).  
   The `/api/faucet` endpoint is used by the website to request XRP.

---

### XRPL EVM Website

1. **Navigate to the website directory:**

   ```bash
   cd project/xrpl-evm-website
   ```

2. **Install dependencies:**

   ```bash
   npm install
   # or
   yarn install
   ```

3. **Start the Development Server:**

   ```bash
   npm run dev
   # or
   yarn dev
   ```

   The website will run at [http://localhost:3000](http://localhost:3000).

---

## Testing the Faucet

1. **Open the Website:**

   - Go to [http://localhost:3000](http://localhost:3000) in your browser.

2. **Select the Network:**

   - Use the network selector in the faucet component to choose between **XRPL EVM Devnet** and **XRPL EVM Testnet**.
   - This selection is passed to MetaMask to add or switch to the appropriate network.

3. **Enter Your EVM Address:**

   - Provide a valid Ethereum-compatible address (must start with `0x`).

4. **Complete Required Steps:**

   - Follow the provided links to follow on X and join Discord.
   - These actions must be completed before submitting a faucet request.

5. **Request XRP:**

   - Click the **Request XRP** button.
   - The backend will:
     - Fund an ephemeral XRPL wallet.
     - Submit a Payment transaction with a unique bridging fraction.
     - Start polling the XRPL and XRPL-EVM networks for transaction status.
   - Real-time updates (e.g. "Settled", "Failed", or "Timeout") are emitted via Socket.IO and logged in the backend console.

6. **Monitor Updates:**

   - You can observe transaction logs in the backend terminal.
   - Optionally, you can integrate a Socket.IO client on the frontend to display status updates in real time.

---

## Additional Scripts

- **generate_report.sh:**  
  To generate a full repository report (structure and file contents), run:

  ```bash
  ./generate_report.sh
  ```

  The report is saved as `repo_report.txt`.

---

## Troubleshooting

- **Environment Variables:**  
  Double-check the values in your `.env` file under `project/faucet-backend`.

- **Port Conflicts:**  
  If port 3003 (backend) or 3000 (frontend) is in use, update the corresponding configuration.

- **MetaMask Integration:**  
  Ensure your MetaMask extension is installed and up to date. If the network prompt does not appear, try manually adding the network using the provided configurations in the faucet component.

---

## Contributing

Contributions are welcome! Please feel free to open issues or submit pull requests with bug fixes or improvements.

---

## License

This project is licensed under the [MIT License](LICENSE).

---

Happy testing and building on the XRPL EVM sidechain!
```