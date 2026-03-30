FROM cypress/base:16@sha256:f4d5f616e83ee6f37913ea18bc1bc4f483bd49b3d7353d04a555af034087b9ff

# checksum from https://dl.min.io/client/mc/release/linux-amd64/mc.RELEASE.2026-03-12T04-18-55Z.sha256sum
# for minio client version:  mc.RELEASE.2025-08-13T08-35-41Z
ARG MC_SUM=01f866e9c5f9b87c2b09116fa5d7c06695b106242d829a8bb32990c00312e891

RUN apt-get update
RUN apt-get install -y git

ADD https://dl.min.io/client/mc/release/linux-amd64/mc.RELEASE.2025-08-13T08-35-41Z /usr/local/bin/mc
# Validate the downloaded binary and abort the build if the checksum doesn't match
RUN echo "${MC_SUM}  /usr/local/bin/mc" | sha256sum -c \
    && chmod +x /usr/local/bin/mc

RUN git clone https://github.com/harvester/harvester-ui-tests.git

WORKDIR /harvester-ui-tests

COPY . /harvester-ui-tests

RUN npm install

ENV PATH /harvester-ui-tests/node_modules/.bin:$PATH

CMD ["./scripts/e2e"]
