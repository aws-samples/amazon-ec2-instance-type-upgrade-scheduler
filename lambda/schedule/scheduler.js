// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const { BatchManager } = require("batch-manager");
const { Instance } = require("instance");
const { InstanceManager } = require("instance-manager");
const { Scheduled } = require("scheduled");

class Scheduler {
    instanceManager = new InstanceManager();
    batchManager = new BatchManager();

    async scheduleRdInstances(mode, limit, allowedDays, holidays) {
        const instances = await this.instanceManager.selectReservedInstances(mode);
        console.log(`Schedule ${instances.length} ${mode} reserved instances.`);

        const dates = new Set();
        for (var i = 0; i < instances.length; i++) {
            const item = instances[i];
            const instance = new Instance(item.id.S, item.mode.S, item.zone.S, item.type.S, item.application.S, item.reserveExpiryDate.S);
            const date = new Date(instance.reserveExpiryDate);
            const batch = this.batchManager.retrieveBatch(date, limit, allowedDays, holidays);
            batch.addInstance(instance);
            dates.add(batch.key);
        }
        console.log(`Scheduled ${dates.size} batches.`);
    }

    async scheduleOdInstances(mode, limit, allowedDays, holidays, sortBy, startDate) {
        const instances = await this.instanceManager.selectOdInstances(mode, sortBy);
        console.log(`Schedule ${instances.length} ${mode} on-demand instances.`)

        const date = new Date(startDate);
        const dates = new Set();
        for (var i = 0; i < instances.length; i++) {
            const item = instances[i];
            const instance = new Instance(item.id.S, item.mode.S, item.zone.S, item.type.S, item.application.S, item.reserveExpiryDate.S);
            const batch = this.batchManager.retrieveBatch(date, limit, allowedDays, holidays);
            batch.addInstance(instance);
            dates.add(batch.key);
        }
        console.log(`Scheduled ${dates.size} batches.`);
    }

    async adjustDatabaseReplica(event) {
        const replicas = await this.instanceManager.selectDatabaseReplicas();

        for (const replica of replicas) {
            const majorBatch = this.batchManager.getBatch(replica.majorInstanceId);
            const minorBatch = this.batchManager.getBatch(replica.minorInstanceId);
            const diff = majorBatch.date.getTime() - minorBatch.date.getTime();
            if (diff > 0) {
                console.log(`For ${replica.id}, major date ${majorBatch.date.toDateString()} is later than minor date ${minorBatch.date.toDateString()}, no adjustment.`);
            } else if (diff < 0) {
                console.log(`For ${replica.id}, major date ${majorBatch.date.toDateString()} is earlier than minor date ${minorBatch.date.toDateString()}, need to switch.`);
                this.batchManager.exchange(majorBatch, replica.majorInstanceId, minorBatch, replica.minorInstanceId);
            } else {
                console.log(`For ${replica.id}, major date ${majorBatch.date.toDateString()} is the same with minor date ${minorBatch.date.toDateString()}, need to postpone.`);
                this.batchManager.postpone(replica.majorInstanceId, event);
            }
        }
    }

    async adjustLoadBalancing(event) {
        const lbs = await this.instanceManager.selectLoadBalancings();

        var sameSize = 0;
        for (const lb of lbs) {
            const setA = new Set(lb.groupA.map(i => this.batchManager.getBatch(i).date.toDateString()));
            const setB = new Set(lb.groupB.map(i => this.batchManager.getBatch(i).date.toDateString()));

            if (setA.size == setB.size && setA.size == 1) {
                sameSize++;
                for (const instanceId of lb.groupB) {
                    this.batchManager.postpone(instanceId, event);
                }
            } else {
                const arrA = Array.from(setA).sort();
                const arrB = Array.from(setB).sort();
                console.log(`Process ${arrA} and ${arrB}`);
                if (arrA[0] <= arrB[0]) {
                    const lastDate = arrA[arrA.length - 1];
                    for (const instanceId of lb.groupB) {
                        const date = this.batchManager.getBatch(instanceId).date.toDateString();
                        if (date <= lastDate) {
                            console.log(`Instance ${instanceId} in group B at ${date} is not later than ${lastDate}, postpone it.`);
                            this.batchManager.postponeWith(lastDate, instanceId, event);
                        }
                    }
                } else {
                    const lastDate = arrB[arrB.length - 1];
                    for (const instanceId of lb.groupA) {
                        const date = this.batchManager.getBatch(instanceId).date.toDateString();
                        if (date <= lastDate) {
                            console.log(`Instance ${instanceId} in group A at ${date} is not later than ${lastDate}, postpone it.`);
                            this.batchManager.postponeWith(lastDate, instanceId, event);
                        }
                    }
                }
            }
        }
        console.log(`In total ${sameSize} same date LB groups.`);
    }

    consolidate() {
        const instances = [];
        const batches = Array.from(this.batchManager.batchMap.values());
        batches.sort((i, j) => i.key.localeCompare(j.key));
        for (const batch of batches) {
            for (const i of batch.instances) {
                const db = this.instanceManager.checkDatabaseReplica(i.id);
                const lb = this.instanceManager.checkLoadBalancing(i.id);
                instances.push(new Scheduled(i.id, i.mode, i.zone, i.type, i.application, i.reserveExpiryDate, batch.date, db[0], db[1], lb[0], lb[1]));
            }
        }

        console.log(instances.join("\n"));
    }

    async schedule(event) {
        await this.scheduleRdInstances("dev", event.devDailyLimit, event.devAllowedDays, event.holidays);
        await this.scheduleOdInstances("dev", event.devDailyLimit, event.devAllowedDays, event.holidays, event.sortBy, event.startDate);
        await this.scheduleRdInstances("prod", event.prodDailyLimit, event.prodAllowedDays, event.holidays);
        await this.scheduleOdInstances("prod", event.prodDailyLimit, event.prodAllowedDays, event.holidays, event.sortBy, event.startDate);
        console.log(`Schedule overview:\n${this.batchManager.toString()}`);

        await this.adjustDatabaseReplica(event);
        console.log(`Schedule overview:\n${this.batchManager.toString()}`);

        await this.adjustLoadBalancing(event);
        console.log(`Schedule overview:\n${this.batchManager.toString()}`);

        this.consolidate();
    }
}

exports.handler = async event => {
    console.log(`Input data is ${JSON.stringify(event)}`);

    Date.prototype.toDateString = function() { return this.toISOString().substring(0, 10);};
    Date.prototype.plusDays = function(days) { const d = new Date(this); d.setDate(d.getDate() + days); return d; };
    Date.prototype.plusOneDay = function() { return this.plusDays(1); };
    Date.prototype.nextValidDate = function(allowedDays, holidays) {
        var date = this;
        while (!allowedDays.includes(date.getDay()) ||
            holidays.includes(date.toDateString())) {
            date = date.plusOneDay();
        };
        return date;
    }

    await new Scheduler().schedule(event);
};
