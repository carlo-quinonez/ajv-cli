'use strict';

var Ajv = require('ajv');
var options = require('./options');
var util = require('./util');
var path = require('path');
var request = require('request-promise');

var loadSchema = function (uri) {
    return request.json(uri).then(function (res) {
        if (res.statusCode >= 400)
            throw new Error('Loading error: ' + res.statusCode);
        return res.body;
    });
};

module.exports = function (argv) {
    var opts = options.get(argv);
    opts.schemaId = 'auto';
    if (argv.o) opts.sourceCode = true;
    opts.loadSchema = loadSchema;
    var ajv = new Ajv(opts);
    var invalid;
    ajv.addMetaSchema(require('ajv/lib/refs/json-schema-draft-04.json'));
    ajv.addMetaSchema(require('ajv/lib/refs/json-schema-draft-06.json'));
    addSchemas(argv.m, 'addMetaSchema', 'meta-schema');
    addSchemas(argv.r, 'addSchema', 'schema');
    customFormatsKeywords(argv.c);
    if (invalid) process.exit(1);
    return ajv;

    function addSchemas(args, method, fileType) {
        if (!args) return;
        var files = util.getFiles(args);
        files.forEach(function (file) {
            var schema = util.openFile(file, fileType);
            try { ajv[method](schema); }
            catch (err) {
                console.error(fileType, file, 'is invalid');
                console.error('error:', err.message);
                invalid = true;
            }
        });
    }

    function customFormatsKeywords(args) {
        if (!args) return;
        var files = util.getFiles(args);
        files.forEach(function (file) {
            if (file[0] == '.') file = path.resolve(process.cwd(), file);
            try {
                require(file)(ajv);
            } catch (err) {
                console.error('module', file, 'is invalid; it should export function');
                console.error('error:', err.message);
                invalid = true;
            }
        });
    }
};
