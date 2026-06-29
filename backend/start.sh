#!/bin/sh

echo "Waiting for database to be ready..."

# Esperar hasta 30 intentos (60 segundos) a que la base de datos responda
MAX_RETRIES=30
RETRY_COUNT=0

until npx prisma db push --accept-data-loss 2>/dev/null; do
  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
    echo "ERROR: Database not available after $MAX_RETRIES attempts. Exiting."
    exit 1
  fi
  echo "Database not ready yet... retrying in 2s ($RETRY_COUNT/$MAX_RETRIES)"
  sleep 2
done

echo "Database migrations applied successfully!"
echo ""
echo "Starting backend application..."
npm start
