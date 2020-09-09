FROM node:14
MAINTAINER Facundo Gonzalez <facugon@theeye.io>
ENV destDir /src/theeye/api
# app directory
RUN mkdir -p ${destDir}
WORKDIR ${destDir}
COPY . ${destDir}
# install
RUN cd ${destDir}; npm install

EXPOSE 6081

CMD ["start.sh"]
