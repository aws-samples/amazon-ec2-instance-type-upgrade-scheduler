// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const { Batch } = require("batch");

class BatchManager {
    batchMap = new Map();
    instanceMap = new Map();

    getBatch(instanceId) {
        return this.instanceMap.get(instanceId);
    }

    createBatch(date, limit) {
        if (this.batchMap.has(date.toDateString())) {
            const batch = this.batchMap.get(date.toDateString());
            return batch.size < limit ? batch : null;
        }

        const batch = new Batch(new Date(date), this);
        this.batchMap.set(batch.key, batch);
        return batch;
    }

    retrieveBatch(date, limit, allowedDays, holidays) {
        var batch = null;
        do {
            date = date.nextValidDate(allowedDays, holidays);
            batch = this.createBatch(date, limit);
            if (batch == null) {
                date = date.plusOneDay();
            }
        } while (batch == null);
        return batch;
    }

    link(instance, batch) {
        this.instanceMap.set(instance.id, batch);
    }

    unlink(instance) {
        this.instanceMap.delete(instance.id);
    }

    exchange(batchA, instanceIdA, batchB, instanceIdB) {
        const instanceA = batchA.removeInstance(instanceIdA);
        const instanceB = batchB.removeInstance(instanceIdB);
        batchA.addInstance(instanceB);
        batchB.addInstance(instanceA);
    }

    postpone(instanceId, event) {
        this.postponeWith(this.getBatch(instanceId).date, instanceId, event);
    }

    postponeWith(date, instanceId, event) {
        const batch = this.getBatch(instanceId);
        const instance = batch.removeInstance(instanceId);
        const newDate = new Date(date).plusOneDay();
        var newBatch = null;
        switch (instance.mode) {
            case "dev":
                newBatch = this.retrieveBatch(newDate, event.devDailyLimit, event.devAllowedDays, event.holidays);
                break;

            case "prod":
                newBatch = this.retrieveBatch(newDate, event.prodDailyLimit, event.prodAllowedDays, event.holidays);
                break;
        }
        newBatch.addInstance(instance);
        console.log(`Postponed instance ${instance.id} from ${batch.date.toDateString()} to ${newBatch.date.toDateString()}`);
    }

    toString() {
        var result = [];
        var batches = Array.from(this.batchMap.values());
        batches.sort((i, j) => i.key.localeCompare(j.key));
        for (var batch of batches) {
            result.push(batch.toString());
        }
        return result.join("\n");
    }
}

module.exports = { BatchManager }
