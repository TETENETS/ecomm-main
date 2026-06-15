FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ARG VITE_BACKEND_URL
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL

# Mover archivos estáticos a public/ para que Vite los copie a dist/
RUN mkdir -p public/js && \
    cp -r css fonts img scss style.css public/ && \
    cp -r js/jquery js/bootstrap.min.js js/popper.min.js js/plugins.js js/classy-nav.min.js js/active.js js/map-active.js public/js/

RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
# Copiamos la configuración para que soporte history API si lo llega a usar
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
