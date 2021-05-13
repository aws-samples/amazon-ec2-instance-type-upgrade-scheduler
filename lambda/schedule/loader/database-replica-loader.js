// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const aws = require('aws-sdk');
const s3 = new aws.S3();
const ssm = new aws.SSM();
const dynamodb = new aws.DynamoDB();

const { DatabaseReplica } = require("../database-replica");

class DatabaseReplicaLoader {

    async loadData() {
        const bucket = (await ssm.getParameter({Name: "/scheduler/bucket"}).promise()).Parameter.Value;
        const lines = (await s3.getObject({Bucket: bucket, Key: "database-replicas.csv"}).promise()).Body.toString("utf8").split("\n");
        const replicas = [];
        for (var line of lines) {
            if (line.charCodeAt(line.length - 1) == 13) {
                line = line.substring(0, line.length - 1);
            }

            const cells = line.split(",");
            replicas.push(new DatabaseReplica(cells[0], cells[1], cells[2]));
        }
        console.log(`Loaded ${replicas.length} database replicas.`);
        return replicas;
    }

    async load() {
        await this.insert(await this.loadData());
    }

    async insert(replicas) {
        for (const replica of replicas) {
            const select = `select * from DatabaseReplicaTable where id = '${replica.id}'`;
            const items = (await dynamodb.executeStatement({Statement: select}).promise()).Items;
            switch (items.length) {
                case 0:
                    const insert = `insert into DatabaseReplicaTable value {
                        'id': '${replica.id}',
                        'majorInstanceId': '${replica.majorInstanceId}',
                        'minorInstanceId': '${replica.minorInstanceId}'
                    }`;
                    console.log(`Replica ${replica.id} does not exist, insert it.`);
                    await dynamodb.executeStatement({Statement: insert}).promise();
                    break;

                case 1:
                    const update = `update DatabaseReplicaTable
                        set majorInstanceId = '${replica.majorInstanceId}'
                        set minorInstanceId = '${replica.minorInstanceId}'
                        where id = '${replica.id}'`;
                    console.log(`Replica ${replica.id} exists, update it.`);
                    await dynamodb.executeStatement({Statement: update}).promise();
                    break;
            }
        }
    }
}

module.exports = { DatabaseReplicaLoader }
