FROM gcr.io/silver-harmony-228021/chrome:v2

RUN mkdir -p /pod
COPY . /pod/code
# Kubernetes secrets will be mounted here.
RUN mkdir -p /pod/config
