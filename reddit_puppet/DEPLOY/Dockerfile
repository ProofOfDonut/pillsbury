# Derived from https://paul.kinlan.me/hosting-puppeteer-in-a-docker-container/

FROM gcr.io/silver-harmony-228021/pillsbury-with-chrome:$image_version

# Run everything after as non-privileged user.
# USER pptruser

WORKDIR /pillsbury/code
ENTRYPOINT ["dumb-init", "--"]
CMD ["/pillsbury/code/reddit_puppet/DEPLOY/run.sh"]
