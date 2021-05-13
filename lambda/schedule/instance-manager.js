// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const aws = require('aws-sdk');
const dynamodb = new aws.DynamoDB();
const { Instance } = require("instance");
const { DatabaseReplica } = require("database-replica");
const { LoadBalancing } = require("load-balancing");

class InstanceManager {
    databaseRepicas = [];
    loadBalancings = [];

    async selectReservedInstances(mode) {
        const select = `select * from InstanceTable where reserveExpiryDate != 'OD' and mode = '${mode}'`;
        const items = (await dynamodb.executeStatement({Statement: select}).promise()).Items;
        console.log(`Selected ${items.length} ${mode} reserved instances.`);
        return items;
    }

    async selectOdInstances(mode, sortBy) {
        const select = `select * from InstanceTable where reserveExpiryDate = 'OD' and mode = '${mode}'`;
        const items = (await dynamodb.executeStatement({Statement: select}).promise()).Items;
        console.log(`Selected ${items.length} ${mode} on-demand instances.`);

        switch (sortBy) {
            case 'app':
                console.log("Sort by application.")
                items.sort((i, j) => i.application.S.localeCompare(j.application.S));
                break;

            case 'type':
                console.log("Sort by instance type.")
                items.sort((i, j) => Instance.compareType(j.type.S, i.type.S));
                break;
        }

        return items;
    }

    checkDatabaseReplica(instanceId) {
        for (const i of this.databaseRepicas) {
            if (i.majorInstanceId == instanceId) {
                return [i.id, "major"];
            } else if (i.minorInstanceId == instanceId) {
                return [i.id, "minor"];
            }
        }
        return ["NA", "NA"];
    }

    async selectDatabaseReplicas() {
        const select = "select * from DatabaseReplicaTable";
        const items = (await dynamodb.executeStatement({Statement: select}).promise()).Items;
        console.log(`Selected ${items.length} database replica pairs.`);

        this.databaseRepicas.length = 0;
        for (const item of items) {
            this.databaseRepicas.push(new DatabaseReplica(item.id.S, item.majorInstanceId.S, item.minorInstanceId.S));
        }
        return this.databaseRepicas;
    }

    checkLoadBalancing(instanceId) {
        for (const i of this.loadBalancings) {
            if (i.groupA.includes(instanceId)) {
                return [i.id, "A"];
            } else if (i.groupB.includes(instanceId)) {
                return [i.id, "B"];
            }
        }
        return ["NA", "NA"];
    }

    async selectLoadBalancings() {
        const select = "select * from LoadBalancingTable";
        const items = (await dynamodb.executeStatement({Statement: select}).promise()).Items;
        console.log(`Selected ${items.length} load balancing groups.`);

        this.loadBalancings.length = 0;
        for (const item of items) {
            this.loadBalancings.push(new LoadBalancing(item.id.S, item.groupA.L.map(i => i.S), item.groupB.L.map(i => i.S)));
        }
        return this.loadBalancings;
    }
}

module.exports = { InstanceManager }
