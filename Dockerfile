FROM node:7.7.3-alpine

RUN  mkdir -p /home/optimus/app
#     adduser -S optimus && \
#     chown -R optimus /home/ethnexus
# USER ethnexus

WORKDIR /home/optimus/app

COPY package.json /home/optimus/app/package.json
RUN npm run prod_install

COPY . /home/optimus/app

EXPOSE 3002

CMD ["npm","run","prod"]
