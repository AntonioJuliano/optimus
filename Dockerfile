FROM alpine:3.5

RUN apk update && apk upgrade && \
    apk add --no-cache git nodejs && \
    mkdir -p /home/ethnexus/app 
#     adduser -S ethnexus && \
#     chown -R ethnexus /home/ethnexus
# USER ethnexus

WORKDIR /home/ethnexus/app

COPY package.json /home/ethnexus/app/package.json
RUN npm run prod_install

COPY . /home/ethnexus/app

EXPOSE 3002

CMD ["npm","run","prod"]
