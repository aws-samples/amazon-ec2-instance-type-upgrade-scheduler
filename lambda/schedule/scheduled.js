// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

class Scheduled {
    instanceId;
    mode; // prod / dev
    zone;
    type;
    application;
    reserveExpiryDate;
    scheduleDate;
    databaseRepicaId;
    databaseRepica; // major / minor
    loadBalancingId;
    loadBalancing; // A / B

    constructor(instanceId, mode, zone, type, application, reserveExpiryDate, scheduleDate, databaseRepicaId, databaseRepica, loadBalancingId, loadBalancing) {
        this.instanceId = instanceId;
        this.mode = mode;
        this.zone = zone;
        this.type = type;
        this.application = application;
        this.reserveExpiryDate = reserveExpiryDate;
        this.scheduleDate = scheduleDate;
        this.databaseRepicaId = databaseRepicaId;
        this.databaseRepica = databaseRepica;
        this.loadBalancingId = loadBalancingId;
        this.loadBalancing = loadBalancing;
    }

    toString() {
        const values = [];
        values.push(this.instanceId);
        values.push(this.mode);
        values.push(this.zone);
        values.push(this.type);
        values.push(this.application);
        values.push(this.reserveExpiryDate);
        values.push(this.scheduleDate.toDateString());
        values.push(this.databaseRepicaId);
        values.push(this.databaseRepica);
        values.push(this.loadBalancingId);
        values.push(this.loadBalancing);
        return values.join(", ");
    }
}

module.exports = { Scheduled }
