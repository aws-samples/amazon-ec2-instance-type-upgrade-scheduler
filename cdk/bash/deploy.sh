#!/bin/bash

# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

# This script can deploy the resources to one AWS account, update them and finally destroy them.

readonly ASSET_DIR="/tmp/scheduler"

declare action="deploy"
declare component="all"

function usage() {
  echo "Usage:"
  echo "./deploy.sh [-a deploy|destroy]"
  echo "            [-c all|scheduler]"
  echo " -a the action to do, default deploy"
  echo " -c the individual component to deploy, default all"
  echo
  echo "Set the following environment variables first:"
  echo " - AWS_ACCOUNT:    the 12-digit AWS account number"
  echo " - REGION:         the target region short name, such as cn-northwest-1"
  echo " - PROFILE:        the credential profile for target region"
  exit 1
}

function check_env() {
  if [ -z ${AWS_ACCOUNT} ] || [ -z ${REGION} ] || [ -z ${PROFILE} ]; then
    usage
  fi

  mkdir -p ${ASSET_DIR}/log
}

function datetime_now() {
  echo $(date "+%Y-%m-%d %H:%M:%S - ")
}

function datetime_now_label() {
  echo $(date "+%Y-%m-%dT%H-%M-%S")
}

function file_log() {
  local -ri index=$1
  echo "${ASSET_DIR}/log/deploy-${REGION}-${index}.log"
}

function bucket() {
  if [ -z $bucket ]; then
    bucket=$(aws ssm get-parameter --name "/scheduler/bucket" --profile ${PROFILE} | jq -r .Parameter.Value)
  fi

  echo $bucket
}

function run() {
  local -r cmd=$1
  echo "$(datetime_now) $cmd"
  ($cmd 2>&1 >$(file_log 1)) >$(file_log 2)
  if (($? != 0)); then
    cat $(file_log 1)
    cat $(file_log 2)
    if [ $action == "deploy" ]; then
      exit $?
    fi
  fi
}

function bootstrap() {
  local -r region=$1
  local -r profile=$2

  run "cdk bootstrap aws://${AWS_ACCOUNT}/$region --profile $profile"
}

function deploy_scheduler() {
  if [ $component == "all" ] || [ $component == "scheduler" ]; then
    run "cdk deploy SchedulerStack --require-approval never --profile ${PROFILE}"
  fi
}

function deploy() {
  if [ $component == "all" ]; then
    bootstrap $REGION $PROFILE
  fi

  deploy_scheduler

  run "echo 'bye.'"
}

function destroy() {
  if [ $component == "all" ]; then
    run "aws s3 rm s3://$(bucket)          --recursive --profile ${PROFILE}"
    run "cdk destroy SchedulerStack            --force --profile ${PROFILE}"
  fi
}

function deploy_main() {
  echo ""
  echo "Deploy project to AWS"
  check_env

  case $action in
  "destroy") destroy ;;
  "deploy") deploy ;;
  esac
}

while getopts ":a:c:p:" option; do
  case $option in
  a)
    action=${OPTARG}
    [[ $action == "deploy" || $action == "destroy" ]] || usage
    ;;
  c)
    component=${OPTARG}
    [[ $component == "all" || $component == "lb.records" ]] || usage
    ;;
  *) usage ;;
  esac
done
shift $((OPTIND - 1))

deploy_main
