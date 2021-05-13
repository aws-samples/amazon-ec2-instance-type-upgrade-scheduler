// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const core = require('@aws-cdk/core');
const iam = require('@aws-cdk/aws-iam');
const s3 = require('@aws-cdk/aws-s3');
const ssm = require('@aws-cdk/aws-ssm');
const logs = require("@aws-cdk/aws-logs");
const lambda = require('@aws-cdk/aws-lambda');
const dynamodb = require('@aws-cdk/aws-dynamodb');

class SchedulerStack extends core.Stack {
    constructor(scope) {
        super(scope, "SchedulerStack");

        const bucket = this.bucket();
        this.parameter(bucket);
        this.table("InstanceTable");
        this.table("ScheduledTable");
        this.table("LoadBalancingTable");
        this.table("DatabaseReplicaTable");

        const role = new iam.Role(this, "LambdaRole", {
            assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole"),
                iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonS3ReadOnlyAccess"),
                iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonDynamoDBFullAccess"),
                iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonSSMReadOnlyAccess")
            ]
        });
        this.lambda(role, "Ec2UpgradeLoader", "loader.handler");
        this.lambda(role, "Ec2UpgradeScheduler", "scheduler.handler");
    }

    bucket() {
        return new s3.Bucket(this, "Bucket", {
           autoDeleteObjects: true,
           removalPolicy: core.RemovalPolicy.DESTROY
       });
    }

    parameter(bucket) {
        new ssm.StringParameter(this, "BucketName", {
            parameterName: "/scheduler/bucket",
            stringValue: bucket.bucketName,
            description: "Bucket name of the scheduler stack"
        });
    }

    table(name) {
        new dynamodb.Table(this, name, {
            tableName: name,
            removalPolicy: core.RemovalPolicy.DESTROY,
            partitionKey: { name: "id", type: dynamodb.AttributeType.STRING }
        });
    }

    lambda(role, name, handler) {
        return new lambda.Function(this, name, {
            functionName: name,
            handler: handler,
            role: role,
            runtime: lambda.Runtime.NODEJS_12_X,
            timeout: core.Duration.minutes(10),
            logRetention: logs.RetentionDays.ONE_MONTH,
            code: lambda.Code.fromAsset("../lambda/schedule")
        });
    }
}

module.exports = { SchedulerStack }
