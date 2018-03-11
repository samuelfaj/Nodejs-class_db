'use strict';
const db     = require('./helpers/db');
const mysql  = require('mysql');

let conn_ = mysql.createPool(config.database);
let query = new db(conn_)
    .table('users')
    .limit(10);

query.select(['*'],function (result, rows, fields) {
    console.log(result, rows);
});
