FROM gcr.io/silver-harmony-228021/node:v2

RUN mkdir -p /pod
COPY . /pod/code
RUN mkdir -p /pod/config

WORKDIR /pod/code
CMD ["/pod/code/dashboard/DEPLOY/run.sh"]
