# class_db.js
<img src="https://www.issart.com/blog/wp-content/uploads/2017/03/boxbarimage5.jpg" width="150" align="right">

![MIT license](https://img.shields.io/badge/license-MIT-blue.svg)
[![built with NodeJS](https://img.shields.io/badge/built%20with-Node.js-red.svg)](https://www.php.net/)
![MySQL Ready](https://img.shields.io/badge/mysql-ready-green.svg)

It makes your MySQL queries easier.

*Inspired by [PHP's class_db](https://github.com/samuelfaj/class_db)*

## Examples of Usage
```javascript
'use strict';
const db     = require('./db');
const mysql  = require('mysql');

let conn_ = mysql.createPool(config.database);
let query = new db(conn_)
    .table('users')
    .limit(10);

query.select(['*'],function (result, rows, fields) {
    console.log(result, rows);
});
``` 
