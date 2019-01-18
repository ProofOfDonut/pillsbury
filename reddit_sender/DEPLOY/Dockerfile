# Derived from https://paul.kinlan.me/hosting-puppeteer-in-a-docker-container/

FROM gcr.io/silver-harmony-228021/pod-with-chrome:$image_version

# Run everything after as non-privileged user.
# USER pptruser

WORKDIR /pod/code
ENTRYPOINT ["dumb-init", "--"]
CMD ["/pod/code/reddit_sender/DEPLOY/run.sh"]
