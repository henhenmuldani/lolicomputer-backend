# Use the official Bun image with Debian Linux
# Oven is the company name, the creator of Bun
FROM oven/bun:debian

# Create and change to the app directory
WORKDIR /usr/src/app

# Copy app files
COPY . .

# Install app dependencies
RUN bun install

# Copy the Prisma schema and migration files if any
COPY prisma ./prisma

# Generate Prisma
RUN bun x prisma generate

# Migrate the database
RUN bun x prisma migrate deploy

# Local development
# EXPOSE 3000

# Run the application
CMD ["bun", "start"]