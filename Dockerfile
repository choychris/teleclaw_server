FROM node:6.11.5

# use changes to package.json to force Docker not to use the cache
# when we change our application's nodejs dependencies:
COPY package.json /tmp/package.json
RUN cd /tmp && npm install


# Create App Directory
RUN mkdir -p /usr/src/app && cp -a /tmp/node_modules /usr/src/app


# Install App Dependencies
WORKDIR /usr/src/app

# Bundle App Source Code
COPY . /usr/src/app

EXPOSE 8080

ENV NODE_ENV=development

CMD ["npm","run","start:dev"]


# ------orginal--------

# Create App Directory
# RUN mkdir -p /usr/src/app
# WORKDIR /usr/src/app

# Install App Dependencies
# COPY package.json /usr/src/app
# RUN npm install

# Bundle App Source Code
# COPY . /usr/src/app

# EXPOSE 3000
# CMD ["npm","run","start:dev"]

