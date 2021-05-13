// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

class DatabaseReplica {
    id;
    majorInstanceId;
    minorInstanceId;

    constructor(id, majorInstanceId, minorInstanceId) {
        this.id = id;
        this.majorInstanceId = majorInstanceId;
        this.minorInstanceId = minorInstanceId;
    }

    isMajor(instanceId) {
        return this.majorInstanceId == instanceId;
    }

    isMinor(instanceId) {
        return this.minorInstanceId == instanceId;
    }
}

module.exports = { DatabaseReplica }
