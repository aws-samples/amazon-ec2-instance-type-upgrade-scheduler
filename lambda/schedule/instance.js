// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

class Instance {
    id;
    mode; // prod / dev
    zone;
    type;
    application;
    reserveExpiryDate;

    constructor(id, mode, zone, type, application, reserveExpiryDate) {
        this.id = id;
        this.mode = mode;
        this.zone = zone;
        this.type = type;
        this.application = application;
        this.reserveExpiryDate = reserveExpiryDate;
    }

    isProd() {
        return this.mode == "prod";
    }

    isOnDemand() {
        return this.reserveExpiryDate == "OD";
    }

    compareTypeTo(that) {
        return Instance.compareType(this.type, that.type);
    }

    static mapType(type) {
        const subtype = type.substring(3);
        const result = /([0-9]+)xlarge/.exec(subtype);
        if (result != null) {
            return parseInt(result[1]) + 10;
        }

        switch (subtype) {
            case "nano":
                return 1;

            case "micro":
                return 2;

            case "small":
                return 3;

            case "medium":
                return 4;

            case "large":
                return 5;

            case "xlarge":
                return 6;

            case "metal":
                return 100;

        }
    }

    static compareType(a, b) {
        return Instance.mapType(a) - Instance.mapType(b);
    }
}

module.exports = { Instance }
