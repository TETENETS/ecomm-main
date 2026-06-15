#!/bin/sh
set -e

echo "Running database migrations/push..."
npx prisma db push --accept-data-loss

echo "Starting backend application..."
npm start
