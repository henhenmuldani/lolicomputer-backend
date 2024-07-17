# Use the official Bun image with Debian Linux
# Oven is the company name, the creator of Bun
FROM oven/bun:debian

# Create and change to the app directory
WORKDIR /usr/src/app

# Copy app files
COPY . .

# Install app dependencies
RUN bun install

# Generate Prisma
RUN bun db:generate

# Migrate the database
RUN bun db:migrate:dev --name add-slug-to-product

# Local development
EXPOSE 3000

# Run the application
CMD ["bun", "start"]