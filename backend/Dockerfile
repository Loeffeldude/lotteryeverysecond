FROM denoland/deno:latest

WORKDIR /app

# Copy backend files
COPY backend/deno.json ./
COPY backend/lottery ./lottery
COPY backend/migrate_winnings.ts ./
COPY backend/main.ts backend/mod.ts ./

# Cache dependencies
RUN deno cache main.ts 

EXPOSE 3350

CMD ["deno", "run", "--allow-net", "--allow-read", "--allow-write", "--allow-env=DATABASE_PATH", "main.ts"]
