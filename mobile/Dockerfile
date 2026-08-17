# Dockerfile para desplegar el proxy de Metro en AWS App Runner

FROM node:20-slim

WORKDIR /app

# Instalar dependencias necesarias para Expo
RUN apt-get update && apt-get install -null -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copiar archivos de configuración
COPY package*.json ./
COPY tsconfig.json ./

# Instalar dependencias
RUN npm install

# Copiar el resto del código
COPY . .

# Exponer el puerto del proxy (App Runner usa el puerto que definas en su consola, por defecto usaremos PORT env var en server.js)
EXPOSE 8081

# Ejecutar el servidor
CMD ["node", "server.js"]
