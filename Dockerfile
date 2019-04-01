FROM node:boron

WORKDIR /usr/src/bot

COPY package.json .
RUN npm install

COPY bot.js .
COPY config/config.json config/config.json
COPY sec/certificate.pem sec/certificate.pem 
COPY sec/private.key sec/private.key

EXPOSE 8443

CMD [ "npm", "run", "container" ]