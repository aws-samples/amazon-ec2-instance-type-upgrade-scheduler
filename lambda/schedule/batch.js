// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

class Batch {
    date;
    manager;
    instances = [];

    constructor(date, manager) {
        this.date = date;
        this.manager = manager;
    }

    get key() {
        return this.date.toDateString();
    }

    get size() {
        return this.instances.length;
    }

    addInstance(instance) {
        this.instances.push(instance);
        this.manager.link(instance, this);
    }

    removeInstance(instanceId) {
        const index = this.instances.findIndex(i => i.id == instanceId);
        if (index != -1) {
            const instance = this.instances[index];
            this.manager.unlink(instance);
            this.instances.splice(index, 1);
            return instance;
        } else {
            console.warn("Cannot find instance with id: " + instanceId);
            return null;
        }
    }

    toString() {
        return `${this.key} => ${this.size} instances`;
    }
}

module.exports = { Batch }
