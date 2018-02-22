'use strict';

const Loki = require('lokijs'),
    BbPromise = require('bluebird'),
    fs = require("fs-extra"),
    fsn = BbPromise.promisifyAll(require("fs")),
    AzuriteTableResponse = require('./../../model/table/AzuriteTableResponse'),
    TableProxy = require('./../../model/table/TableProxy'),
    EntityGenerator = require('./../../model/table/EntityGenerator'),
    Tables = require('./../Constants').TableStorageTables,
    env = require('./../../core/env');

class TableStorageManager {
    constructor() {
    }

    init() {
        this.db = BbPromise.promisifyAll(new Loki(env.azuriteDBPathTable, { autosave: true, autosaveInterval: 5000 }));
        return fsn.statAsync(env.azuriteDBPathTable)
            .then((stat) => {
                return this.db.loadDatabaseAsync({});
            })
            .then((data) => {
                if (!this.db.getCollection(Tables.Tables)) {
                    this.db.addCollection(Tables.Tables);
                }
                return this.db.saveDatabaseAsync();
            })
            .catch((e) => {
                if (e.code === 'ENOENT') {
                    // No DB has been persisted / initialized yet.
                    this.db.addCollection(Tables.Tables);
                    return this.db.saveDatabaseAsync();
                }
                // This should never happen!
                console.error(`Failed to initialize database at "${env.azuriteDBPathTable}"`);
                throw e;
            });
    }

    createTable(request) {
        const coll = this.db.getCollection(Tables.Tables);
        const tableEntity = EntityGenerator.generateTable(request.tableName);
        const proxy = new TableProxy(coll.insert(tableEntity));
        return BbPromise.resolve(new AzuriteTableResponse({ proxy: proxy }));
    }

    _getTable(name) {
        const coll = this.db.getCollection(Tables.Tables);
        const result = coll.chain()
            .find({ name: name })
            .data();
        return (result.length === 0) ? undefined : new TableProxy(result[0]);
    }

}

module.exports = new TableStorageManager();