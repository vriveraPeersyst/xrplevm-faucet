# faucet-backend.Dockerfile

# --- Integration Stage ---
    ARG BASE_IMAGE=node:18-alpine
    FROM ${BASE_IMAGE} as integration
    
    # Expect sensitive values to be passed as build args.
    ARG XRPL_DEVNET_URL
    ARG XRPL_TESTNET_URL
    ARG TESTNET_GATEWAY_ADDRESS
    ARG DEVNET_GATEWAY_ADDRESS
    ARG PORT
    
    # Set environment variables (do not hardcode any secret)
    ENV XRPL_DEVNET_URL=${XRPL_DEVNET_URL} \
        XRPL_TESTNET_URL=${XRPL_TESTNET_URL} \
        TESTNET_GATEWAY_ADDRESS=${TESTNET_GATEWAY_ADDRESS} \
        DEVNET_GATEWAY_ADDRESS=${DEVNET_GATEWAY_ADDRESS} \
        PORT=${PORT}
    
    WORKDIR /project/faucet-backend
    
    # Copy dependency files and install all dependencies.
    COPY package*.json tsconfig.json ./
    RUN npm install
    
    # Copy source code and build the project.
    COPY src ./src
    RUN npm run build
    
    # --- Release Stage ---
    FROM node:18-alpine as release
    WORKDIR /project/faucet-backend
    
    # Copy only necessary files from the integration stage.
    COPY package*.json ./
    COPY --from=integration /project/faucet-backend/dist ./dist
    
    # Install only production dependencies.
    RUN npm install --only=production
    
    EXPOSE ${PORT}
    CMD ["node", "dist/index.js"]
    