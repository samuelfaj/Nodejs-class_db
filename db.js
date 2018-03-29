'use strict';
const mysql  = require('mysql');

module.exports = function (pool) {
    const self = this;

    this.sql     = '';
    this._table   = '';

    this.wheres  = [];
    this.orders  = [];
    this.groups  = [];
    this.updates = [];
    this.q_limit = '';

    this.result   = null;
    this.fields   = {};
    this.results  = {};
    this.insertId = undefined;

    this.table  = function ($table) {
        self._table = $table;

        return self;
    };
    this.exec   = function (type, result_comparison_signal, callback) {
        let result = false;

        pool.query(self.sql, function (error, results, fields) {
            if(error) { console.error(error); callback(null); throw error; }

            switch(type){
                case 'select':
                    result = (self.compare(results.length, result_comparison_signal , 0));
                break;
                case 'insert':
                case 'update':
                case 'delete':
                    result = (
                        ('changedRows'  in results && self.compare(results.changedRows  , result_comparison_signal , 0)) ||
                        ('affectedRows' in results && self.compare(results.affectedRows , result_comparison_signal , 0))
                    );
                break;
            }

            self.result   = result;
            self.fields   = fields;
            self.results  = results;
            self.insertId = ('insertId' in results) ? results.insertId : undefined;

            callback(result, results, fields);
        });
    };
    this.query  = function (sql, callback) {
        pool.query(sql, function (error, results, fields) {
            if(error) { console.error(error); callback(null); throw error; }

            self.fields   = fields;
            self.results  = results;
            self.insertId = ('insertId' in results) ? results.insertId : undefined;

            callback(results, fields);
        });
    };

    this.select = function ($fields = ['*'], $callback, $result_comparison_signal = '>') {
        self.sql =
            'SELECT ' + self.addslashes($fields.join(',')) + ' ' +
            'FROM   ' + self._table + ' ' +
            self.mount_where();

        if(self.groups.length > 0){ self.sql = self.sql + ' GROUP BY ' + self.groups.join(','); }

        self.sql = self.sql + self.mount_order_by();

        if(self.q_limit.length > 0){ self.sql = self.sql + ' LIMIT ' + self.q_limit }

        self.exec('select',$result_comparison_signal, $callback);
        return self;
    };
    this.insert = function ($insert, $callback, $addslashes = true, $literal = false, $result_comparison_signal = '>') {
        if($addslashes) $insert = self.addslashes($insert);

        let keys   = [];
        let values = [];


        for (let key_ in $insert) {
            keys.push(key_);
            values.push($insert[key_]);
        }

        if(!$literal){
            self.sql =
                "INSERT INTO " + self._table + " (" + keys.join(',') + ") " +
                "VALUES ('" + values.join("','") + "');";
        } else {
            self.sql =
                "INSERT INTO " + self._table + " (" + keys.join(',') + ") " +
                "VALUES (" + values.join(",") + ");";
        }

        self.exec('insert',$result_comparison_signal, $callback);

        return self;
    };
    this.update = function ($update, $callback, $safemode = true, $addslashes = true, $literal = false, $result_comparison_signal = '>'){
        let $where = self.mount_where();

        if($safemode && $where.length === 0) return false;

        self.updates = ($addslashes) ? self.addslashes($update) : $update;

        self.sql = "UPDATE " + self._table + self.mount_update($literal) + $where;

        self.exec('update',$result_comparison_signal, $callback);

        return self;
    };
    this.delete = function ($callback, $safemode = true, $result_comparison_signal = '>'){
        let $where = self.mount_where();

        if($safemode && $where.length === 0) return false;

        self.sql = "DELETE FROM " + self._table + $where;

        self.exec('delete',$result_comparison_signal, $callback);

        return self;
    };

    this.where  = function ($field, $value, $operator = '=', $addslashes = true, $literal = false){
        if($addslashes){ $value = self.addslashes($value); }

        self.wheres.push({
            'field': $field,
            'value': $value,
            'operator': $operator,
            'literal': $literal
        });

        return self;
    };
    this.order  = function ($field, $order = 'ASC') {
        self.orders.push({
            'field': $field,
            'order': $order
        });

        return self;
    };
    this.group  = function($group){
        self.groups.push($group);

        return self;
    };

    this.limit  = function ($limit) {
        self.q_limit = (typeof $limit === 'object') ? $limit[0] + ',' + $limit[1] : $limit;
        self.q_limit = self.q_limit.toString();

        return self;
    };
    this.clear  = function ($parameter = 'all'){
        switch($parameter){
            case 'limit':
                self.q_limit = '';
                break;
            case 'group':
            case 'groups':
                self.groups = [];
            break;
            case 'where':
            case 'wheres':
                self.wheres = [];
            break;
            case 'order':
            case 'orders':
                self.orders = [];
                break;
            default:
                self.q_limit  = '';
                self.groups = [];
                self.wheres = [];
                self.orders = [];
            break;
        }

        return self;
    };

    this.mount_update   = function($literal){
        if(self.updates.length === 0) return '';

        let $conditions = [];
        for (let key_ in self.updates) {
            $conditions.push(
                (!$literal)
                    ? key_ + " = '" + self.updates[key_] + "'"
                    : key_ + " = "  + self.updates[key_]
            );
        }

        return ' SET ' + $conditions.join(' , ');
    };
    this.mount_where    = function(){
        if(self.wheres.length === 0) return '';

        let $conditions = [];
        for (let key_ in self.wheres) {
            let $value = self.wheres[key_];

            if($value['literal'] === false){ $value['value'] = "'" + $value['value'] + "'"; }
            $conditions.push($value['field'] + ' ' + $value['operator'] + " " + $value['value']);
        }

        return ' WHERE ' + $conditions.join(' AND ');
    };
    this.mount_order_by = function(){
        if(self.orders.length === 0) return '';

        let $conditions = [];
        for (let key_ in self.orders) {
            $conditions.push(key_ + " = "  + self.updates[key_]);
        }

        return ' ORDER BY ' + $conditions.join(' , ');
    };

    this.compare    = function(post, operator, value) {
        switch (operator) {
            case '>':   return post > value;
            case '<':   return post < value;
            case '>=':  return post >= value;
            case '<=':  return post <= value;
            case '==':  return post == value;
            case '!=':  return post != value;
            case '===': return post === value;
            case '!==': return post !== value;
        }
    };
    this.addslashes = function ($string){
        let $array = {};

        if(typeof $string === 'string'){
            return $string
                .replace(/\\/g, '\\\\')
                .replace(/\t/g, '\\t')
                .replace(/\n/g, '\\n')
                .replace(/\f/g, '\\f')
                .replace(/\r/g, '\\r')
                .replace(/'/g, '\\\'')
                .replace(/"/g, '\\"')
                .replace(/\u0008/g, '\\b');
        }

        if(typeof $string === 'object'){
            for (let key in $string) {
                $array[key] = $string[key]
                .replace(/\\/g, '\\\\')
                .replace(/\t/g, '\\t')
                .replace(/\n/g, '\\n')
                .replace(/\f/g, '\\f')
                .replace(/\r/g, '\\r')
                .replace(/'/g, '\\\'')
                .replace(/"/g, '\\"')
                .replace(/\u0008/g, '\\b');
            }
            return $array;
        }

        return $string;
    };
};
