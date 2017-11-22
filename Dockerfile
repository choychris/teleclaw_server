FROM node:6.11.1

# Create App Directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Install App Dependencies
COPY package.json /usr/src/app
RUN npm install

# Bundle App Source Code
COPY . /usr/src/app

EXPOSE 3000
CMD ["npm","run","start:dev"]
