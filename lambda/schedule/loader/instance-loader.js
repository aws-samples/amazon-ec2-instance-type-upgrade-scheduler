// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const aws = require('aws-sdk');
const s3 = new aws.S3();
const ssm = new aws.SSM();
const dynamodb = new aws.DynamoDB();

const { Instance } = require("../instance");

class InstanceLoader {

    async loadData() {
        const bucket = (await ssm.getParameter({Name: "/scheduler/bucket"}).promise()).Parameter.Value;
        const lines = (await s3.getObject({Bucket: bucket, Key: "instances.csv"}).promise()).Body.toString("utf8").split("\n");
        const instances = [];
        for (var line of lines) {
            if (line.charCodeAt(line.length - 1) == 13) {
                line = line.substring(0, line.length - 1);
            }

            const cells = line.split(",");
            instances.push(new Instance(cells[0], cells[1], cells[2], cells[3], cells[4], cells[5]));
        }
        console.log(`Loaded ${instances.length} instances.`);
        return instances;
    }

    async load() {
        await this.insert(await this.loadData());
    }

    async insert(instances) {
        for (const instance of instances) {
            const select = `select * from InstanceTable where id = '${instance.id}'`;
            const items = (await dynamodb.executeStatement({Statement: select}).promise()).Items;
            switch (items.length) {
                case 0:
                    const insert = `insert into InstanceTable value {
                        'id': '${instance.id}',
                        'mode': '${instance.mode}',
                        'zone': '${instance.zone}',
                        'type': '${instance.type}',
                        'application': '${instance.application}',
                        'reserveExpiryDate': '${instance.reserveExpiryDate}'
                    }`;
                    console.log(`Instance ${instance.id} does not exist, insert it.`);
                    await dynamodb.executeStatement({Statement: insert}).promise();
                    break;

                case 1:
                    const update = `update InstanceTable
                        set mode = '${instance.mode}'
                        set zone = '${instance.zone}'
                        set type = '${instance.type}'
                        set application = '${instance.application}'
                        set reserveExpiryDate = '${instance.reserveExpiryDate}'
                        where id = '${instance.id}'`;
                    console.log(`Instance ${instance.id} exists, update it.`);
                    await dynamodb.executeStatement({Statement: update}).promise();
                    break;
            }
        }
    }
}

module.exports = { InstanceLoader }
