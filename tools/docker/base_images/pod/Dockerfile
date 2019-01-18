FROM gcr.io/silver-harmony-228021/node-python-psql:v2

RUN mkdir -p /pod
COPY . /pod/code
# Kubernetes secrets will be mounted here.
RUN mkdir -p /pod/config
