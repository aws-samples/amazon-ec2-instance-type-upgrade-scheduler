// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const aws = require('aws-sdk');
const s3 = new aws.S3();
const ssm = new aws.SSM();
const dynamodb = new aws.DynamoDB();

const { LoadBalancing } = require("../load-balancing");

class LoadBalancingLoader {

    extractGroup(value) {
        if (value.includes("-")) {
            return value.split("-");
        } else {
            return [value];
        }
    }

    async loadData() {
        const bucket = (await ssm.getParameter({Name: "/scheduler/bucket"}).promise()).Parameter.Value;
        const lines = (await s3.getObject({Bucket: bucket, Key: "load-balancing.csv"}).promise()).Body.toString("utf8").split("\n");
        const lbs = [];
        for (var line of lines) {
            if (line.charCodeAt(line.length - 1) == 13) {
                line = line.substring(0, line.length - 1);
            }

            const cells = line.split(",");
            lbs.push(new LoadBalancing(cells[0], this.extractGroup(cells[1]), this.extractGroup(cells[2])));
        }
        console.log(`Loaded ${lbs.length} load balancing groups.`);
        return lbs;
    }

    async load() {
        await this.insert(await this.loadData());
    }

    async insert(lbs) {
        for (const lb of lbs) {
            const select = `select * from LoadBalancingTable where id = '${lb.id}'`;
            const items = (await dynamodb.executeStatement({Statement: select}).promise()).Items;
            switch (items.length) {
                case 0:
                    const insert = `insert into LoadBalancingTable value {
                        'id': '${lb.id}',
                        'groupA': [${lb.toQuotedString(lb.groupA)}],
                        'groupB': [${lb.toQuotedString(lb.groupB)}]
                    }`;
                    console.log(`Load balancing ${lb.id} does not exist, insert it.`);
                    await dynamodb.executeStatement({Statement: insert}).promise();
                    break;

                case 1:
                    const update = `update LoadBalancingTable
                        set groupA = [${lb.toQuotedString(lb.groupA)}]
                        set groupB = [${lb.toQuotedString(lb.groupB)}]
                        where id = '${lb.id}'`;
                    console.log(`Load balancing ${lb.id} exists, update it.`);
                    await dynamodb.executeStatement({Statement: update}).promise();
                    break;
            }
        }
    }
}

module.exports = { LoadBalancingLoader }
