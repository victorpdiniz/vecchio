FROM node:22-slim

WORKDIR /app

# openssl: necessário pelo Prisma para gerar o client. git: usado pelo módulo
# de autoatualização (backend/src/modules/system) para checar/aplicar
# atualizações do repositório — só enxerga .git via bind mount, nunca o
# socket do Docker (ver docs/self-update-setup.md).
RUN apt-get update -y && apt-get install -y openssl git && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm install

COPY . .
RUN npx prisma generate

EXPOSE 3333

CMD ["npm", "run", "dev"]
