FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Generate Prisma client
RUN npx prisma generate

# Make start script executable
RUN chmod +x start.sh

EXPOSE 3001

CMD ["./start.sh"]
