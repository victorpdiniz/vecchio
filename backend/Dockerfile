FROM node:22-slim

WORKDIR /app

# Necessário pelo Prisma para gerar o client em cima do OpenSSL do container.
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm install

COPY . .
RUN npx prisma generate

EXPOSE 3333

CMD ["npm", "run", "dev"]
