// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const { InstanceLoader } = require('loader/instance-loader');
const { DatabaseReplicaLoader } = require('loader/database-replica-loader');
const { LoadBalancingLoader } = require('loader/load-balancing-loader');

exports.handler = async event => {
    await new InstanceLoader().load();
    await new DatabaseReplicaLoader().load();
    await new LoadBalancingLoader().load();
};

