# 5.4.0 version overall with chart
# version mc client , mc:0.20250813.083541-8.4
# sha256:4d82b0fc31c9f59ae5b6c3b3ae0a37396d711e33468c5c89b25bf6c1da269f83
FROM dp.apps.rancher.io/containers/mc@sha256:4d82b0fc31c9f59ae5b6c3b3ae0a37396d711e33468c5c89b25bf6c1da269f83 AS rancher-minio-client-binary-source
#cypress/base:18.20.3 compatible with mc client
FROM cypress/base@sha256:eb3d0807d128c9d6eec3a667db4c7fdc9e05b55a6018ad3e8c1641e05bb29932


RUN apt-get update
RUN apt-get install -y git

COPY --from=rancher-minio-client-binary-source /usr/bin/mc /usr/local/bin/mc

RUN chmod +x /usr/local/bin/mc

RUN git clone https://github.com/harvester/harvester-ui-tests.git

WORKDIR /harvester-ui-tests

COPY . /harvester-ui-tests

RUN npm install

ENV PATH /harvester-ui-tests/node_modules/.bin:$PATH

CMD ["./scripts/e2e"]