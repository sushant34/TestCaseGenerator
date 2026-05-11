FROM node:20-alpine

WORKDIR /app

# Copy package info and install deps
COPY package.json ./
RUN npm install

# Copy app files
COPY . .

EXPOSE 80

CMD ["npm", "start"]
