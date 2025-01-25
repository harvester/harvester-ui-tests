FROM cypress/base:16

RUN apt-get update
RUN apt-get install -y git

ADD https://dl.min.io/client/mc/release/linux-amd64/mc /usr/local/bin/mc
RUN chmod +x /usr/local/bin/mc

RUN git clone https://github.com/harvester/harvester-ui-tests.git

WORKDIR /harvester-ui-tests

COPY . /harvester-ui-tests

RUN npm install

ENV PATH /harvester-ui-tests/node_modules/.bin:$PATH

CMD ["./scripts/e2e"]
