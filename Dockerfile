FROM node:14
MAINTAINER Facundo Gonzalez <facugon@theeye.io>
ENV destDir /src/theeye/api
# app directory
RUN mkdir -p ${destDir}
WORKDIR ${destDir}
COPY . ${destDir}
# install app
RUN cd ${destDir}; npm install
RUN chmod 777 start.sh
# install aws cli
RUN apt-get update && apt-get install -y python3
RUN curl -sO https://bootstrap.pypa.io/get-pip.py
RUN python3 get-pip.py
RUN pip install awscli

EXPOSE 6081

CMD "/src/theeye/api/start.sh"
