# Etapa 1: Construir el Admin (React)
FROM node:20-alpine AS admin-builder
WORKDIR /app/admin
COPY admin/package*.json ./
RUN npm install
COPY admin/ ./
RUN npm run build

# Etapa 2: Configurar Backend (Express)
FROM node:20-alpine AS backend
WORKDIR /app

# Crear directorio para persistencia de subidas de Multer
RUN mkdir -p /app/uploads

# Copiar package.json del backend e instalar dependencias
COPY backend/package*.json ./
RUN npm install --production

# Copiar Prisma y generar cliente
COPY backend/prisma ./prisma
RUN npx prisma generate

# Copiar todo el código del backend
COPY backend/ ./

# Copiar el build del admin hacia una carpeta pública del backend
COPY --from=admin-builder /app/admin/dist /app/public/admin

# (Opcional) Copiar los archivos estáticos de la tienda raíz a public/store
# Asegúrate de añadir comandos aquí si movemos los HTML al public/store
COPY *.html /app/public/store/
COPY css/ /app/public/store/css/
COPY fonts/ /app/public/store/fonts/
COPY img/ /app/public/store/img/
COPY js/ /app/public/store/js/
COPY scss/ /app/public/store/scss/

EXPOSE 3001
CMD ["node", "index.js"]
