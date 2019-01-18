#!/bin/bash
set -e -o pipefail

version="$1"
if [ "$version" == '' ]; then
  echo 'Expected version param.' >&2
  exit 1
fi

project_filter="$2"

repo='gcr.io/silver-harmony-228021'
base_tag="$repo/pod:$version"
veiled_workspace=$(bin/veil pwd)

bin/veil -u
if [ "$project_filter" != 'dashboard' ]; then
  bin/veil "tsc"
fi
if [ "$project_filter" == '' ] || [ "$project_filter" == 'dashboard' ]; then
  dashboard/BUILD/build.sh
fi

function deploy() {
  local project="$1"
  if [ "$project" == '' ]; then
    echo 'Missing project parameter' >&2
    exit 1
  fi
  if [ "$project_filter" != '' ] && [ "$project" != "$project_filter" ]; then
    # Skip
    return
  fi

  echo "Deploying $project..."

  build_and_push "$project/DEPLOY" "$project"
  bin/veil "sed 's/\$image_version/$version/g' \
      < $project/DEPLOY/deployment.yaml \
      > $project/DEPLOY/deployment.yaml.out"
  bin/veil "kubectl apply -f $project/DEPLOY/deployment.yaml.out"
}

function build_and_push() {
  local dir="$1"
  local project="$2"
  if [ "$dir" == '' ]; then
    echo 'Missing dir parameter' >&2
    exit 1
  fi
  if [ "$project" == '' ]; then
    echo 'Missing project parameter' >&2
    exit 1
  fi

  local tag="$repo/${project//_/-}:$version"

  bin/veil "sed 's/\$image_version/$version/g' \
      < $dir/Dockerfile \
      > $dir/Dockerfile.out"
  bin/veil "docker build \
      -t $tag \
      -f $dir/Dockerfile.out \
      $veiled_workspace"
  docker push $tag
}

if [ "$project_filter" != 'dashboard' ]; then
  # Build project base
  bin/veil "docker build \
      -t $base_tag \
      -f tools/docker/base_images/pod/Dockerfile \
      $veiled_workspace"
  docker push $base_tag

  # Build base for reddit_sender
  build_and_push tools/docker/base_images/pod_with_chrome pod_with_chrome
fi

deploy api
deploy dashboard
deploy ethereum_monitor
deploy ethereum_sender
deploy reddit_monitor
deploy reddit_sender
