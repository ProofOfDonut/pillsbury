FROM $registry/node:v2

RUN mkdir -p /pillsbury
COPY . /pillsbury/code
RUN mkdir -p /pillsbury/config

WORKDIR /pillsbury/code
CMD ["/pillsbury/code/dashboard/DEPLOY/run.sh"]
