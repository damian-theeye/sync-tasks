FROM node:14
MAINTAINER Facundo Gonzalez <facugon@theeye.io>
ENV destDir /src/theeye/api
# app directory
RUN mkdir -p ${destDir}
WORKDIR ${destDir}
COPY . ${destDir}
# install
RUN cd ${destDir}; npm install
RUN chmod 777 start.sh
EXPOSE 6081

CMD "/src/theeye/api/start.sh"
