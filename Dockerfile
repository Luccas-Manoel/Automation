# Usa uma imagem oficial do Node.js
FROM node:18

# Cria o diretório da aplicação
WORKDIR /usr/src/app

# Copia os arquivos de dependências
COPY package*.json ./

# Instala as dependências
RUN npm install

# Copia o resto do código da sua aplicação
COPY . .

# Expõe a porta que a sua aplicação vai usar
EXPOSE 3000

# Comando para iniciar a aplicação
CMD [ "node", "index.js" ]