# Use the official Node.js image as the base image
FROM node:20.19.5-alpine

# Set the working directory
WORKDIR /app

# Copy pnpm related files from root
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json ./apps/backend/

# Install pnpm globally and then install dependencies for the monorepo
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Set the working directory for the backend app
WORKDIR /app/apps/backend

# Copy the rest of the application code
COPY apps/backend/src ./src
COPY apps/backend/nest-cli.json .
COPY apps/backend/tsconfig.build.json .
COPY apps/backend/tsconfig.json .

# Build the NestJS application
RUN pnpm --filter backend build

# Expose the port the app runs on
EXPOSE 3000

# Command to run the application
CMD ["pnpm", "turbo", "run", "start:backend"]