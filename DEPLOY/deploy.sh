#!/bin/bash
set -e -o pipefail

registry="$1"
if [ "$registry" == '' ]; then
  echo 'Expected container registry.' >&2
  exit 1
fi
shift

project_filter="$1"
shift

version=$(tools/git/get_latest_commit.sh)

veiled_workspace=$(bin/veil pwd)

function deploy() {
  local project="$1"
  local type="$2"
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

  if [ "$type" == '' ]; then
    yaml='deployment.yaml'
  else
    yaml="$type.yaml"
  fi
  bin/veil "sed 's/\$registry/$registry/g;s/\$image_version/$version/g' \
      < $project/DEPLOY/$yaml \
      > $project/DEPLOY/$yaml.out"
  bin/veil "kubectl apply -f $project/DEPLOY/$yaml.out"
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

  local tag="$registry/${project//_/-}:$version"

  bin/veil "sed 's/\$image_version/$version/g' \
      < $dir/Dockerfile \
      > $dir/Dockerfile.out"
  bin/veil "docker build \
      -t $tag \
      -f $dir/Dockerfile.out \
      $veiled_workspace"
  docker push $tag
}

function check_continue() {
  local prompt="$1"
  local yn=''

  read -p "$prompt " yn
  if [[ ! "${yn:0:1}" =~ ^[Yy]$ ]]; then
    exit 1
  fi
}

if [ "$project_filter" == 'reddit_refunder' ]; then
  check_continue 'Are you sure you want to issue refunds? [y/N]'
fi

bin/veil -u
if [ "$project_filter" != 'dashboard' ]; then
  bin/veil "tsc"
fi
if [ "$project_filter" == '' ] || [ "$project_filter" == 'dashboard' ]; then
  dashboard/BUILD/build.sh
fi

if [ "$project_filter" != 'dashboard' ]; then
  # Build project base
  build_and_push \
      tools/docker/base_images/pillsbury \
      pillsbury
fi

deploy api
deploy dashboard
deploy ethereum_monitor
deploy ethereum_sender
deploy reddit_balance_monitor
deploy reddit_delivery_monitor
deploy reddit_puppet

# Only deploy reddit_refunder if it was specified.
if [ "$project_filter" == 'reddit_refunder' ]; then
  deploy reddit_refunder job
fi
