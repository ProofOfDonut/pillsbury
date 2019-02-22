FROM gcr.io/silver-harmony-228021/node-python-psql:v2

RUN mkdir -p /pillsbury
COPY . /pillsbury/code
# Kubernetes secrets will be mounted here.
RUN mkdir -p /pillsbury/config
