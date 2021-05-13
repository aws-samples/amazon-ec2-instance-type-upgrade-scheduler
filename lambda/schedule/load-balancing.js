// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

class LoadBalancing {
    id;
    groupA;
    groupB;

    constructor(id, groupA, groupB) {
        this.id = id;
        this.groupA = groupA;
        this.groupB = groupB;
    }

    toQuotedString(arr) {
        return "'" + arr.join("', '") + "'";
    }
}

module.exports = { LoadBalancing }
