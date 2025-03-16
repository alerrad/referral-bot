# ---- Stage 1: Build the app ----
FROM node:latest AS builder
WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# Copy package files and the pnpm lock file, then install dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install

# Copy the rest of the application code
COPY . .

# Generate the Prisma client using npx
RUN npx prisma generate

# Build the Next.js application
RUN pnpm run build

# ---- Stage 2: Run the app in production ----
FROM node:latest AS runner
WORKDIR /app

# Set the environment to production
ENV NODE_ENV=production

# Install pnpm globally in the runner image
RUN npm install -g pnpm

# Copy only the necessary files from the builder stage
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Expose the port the app runs on
EXPOSE 3000

# Start the Next.js server using pnpm
CMD ["pnpm", "start"]
