FROM node:boron

WORKDIR /usr/src/bot

COPY package.json .
RUN npm install

COPY bot.js .
COPY config/config.json config/config.json

EXPOSE 8443

CMD [ "npm", "run", "boot" ]