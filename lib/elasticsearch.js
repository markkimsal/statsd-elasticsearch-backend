/*
 * Flush stats to ElasticSearch (http://www.elasticsearch.org/)
 *
 * To enable this backend, include 'elastic' in the backends
 * configuration array:
 *
 *   backends: ['./backends/elastic'] 
 *  (if the config file is in the statsd folder)
 *
 * A sample configuration can be found in exampleElasticConfig.js
 *
 * This backend supports the following config options:
 *
 *   host:            hostname or IP of ElasticSearch server
 *   port:            port of Elastic Search Server
 *   path:            http path of Elastic Search Server (default: '/')
 *   indexPrefix:     Prefix of the dynamic index to be created (default: 'statsd')
 *   indexTimestamp:  Timestamping format of the index, either "year", "month" or "day"
 *   indexType:       The dociment type of the saved stat (default: 'stat')
 */

var net = require('net'),
    util = require('util'),
    http = require('http'),
    named = require('named-regexp').named,
    extend = require('util')._extend;
// this will be instantiated to the logger
var lg;
var debug;
var keyRegex;
var flushInterval;
var elasticHost;
var elasticPort;
var elasticPath;
var elasticIndex;
var elasticIndexTimestamp;
var elasticCountType;
var elasticTimerType;

var elasticStats = {};


var es_bulk_insert = function elasticsearch_bulk_insert(listCounters, listTimers, listTimerData) {

      var indexDate = new Date();

      var statsdIndex = elasticIndex + '-' + indexDate.getUTCFullYear()

      if (elasticIndexTimestamp == 'month' || elasticIndexTimestamp == 'day'){
        var indexMo = indexDate.getUTCMonth() +1;
        if (indexMo < 10) {
            indexMo = '0'+indexMo;
        }
        statsdIndex += '.' + indexMo;
      }

      if (elasticIndexTimestamp == 'day'){
        var indexDt = indexDate.getUTCDate();
        if (indexDt < 10) {
            indexDt = '0'+indexDt;
        }
        statsdIndex += '.' +  indexDt;
      }

      var payload = '';
      for (key in listCounters) {
        payload += '{"index":{"_index":"'+statsdIndex+'","_type":"'+elasticCountType+'"}}'+"\n";
        payload += '{';
        innerPayload = '';
          for (statKey in listCounters[key]){
            if (innerPayload) innerPayload += ',';
            innerPayload += '"'+statKey+'":"'+listCounters[key][statKey]+'"';
          }
        payload += innerPayload +'}'+"\n";
      }
      for (key in listTimers) {
        payload += '{"index":{"_index":"'+statsdIndex+'","_type":"'+elasticTimerType+'"}}'+"\n";
        payload += '{';
        innerPayload = '';
          for (statKey in listTimers[key]){
            if (innerPayload) innerPayload += ',';
            innerPayload += '"'+statKey+'":"'+listTimers[key][statKey]+'"';
          }
        payload += innerPayload +'}'+"\n";
      }
      for (key in listTimerData) {
        payload += '{"index":{"_index":"'+statsdIndex+'","_type":"'+elasticTimerDataType+'"}}'+"\n";
        payload += '{';
        innerPayload = '';
          for (statKey in listTimerData[key]){
            if (innerPayload) innerPayload += ',';
            innerPayload += '"'+statKey+'":"'+listTimerData[key][statKey]+'"';
          }
        payload += innerPayload +'}'+"\n";
      }

      var optionsPost = {
        host: elasticHost,
        port: elasticPort,
        path: elasticPath + statsdIndex + '/' + '/_bulk',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': payload.length
        }
      };

      var req = http.request(optionsPost, function(res) {
          res.on('data', function(d) {
            if (Math.floor(res.statusCode / 100) == 5){
              var errdata = "HTTP " + res.statusCode + ": " + d;
              lg.log('error', errdata);
            }
          });
      }).on('error', function(err) {
          lg.log('error', 'Error with HTTP request, no stats flushed.');
          console.log(err);
      });

      if (debug) {
        lg.log('ES payload:');
        lg.log(payload);
      }
      req.write(payload);
      req.end();
}

var flush_stats = function elastic_flush(ts, metrics) {
  var statString = '';
  var numStats = 0;
  var key;
  var array_counts     = new Array();
  var array_timers     = new Array();
  var array_timer_data = new Array();

  ts = ts*1000;
/*
  var gauges = metrics.gauges;
  var pctThreshold = metrics.pctThreshold;
 */

  var matched;

  for (key in metrics.counters) {
    matched = keyRegex.exec(key);
    if (matched === null) continue;

    array_counts.push(extend(matched.captures, {
      "val": metrics.counters[key],
      "@timestamp": ts
    }));

    numStats += 1;
  }

  for (key in metrics.timers) {
    matched = keyRegex.exec(key);
    if (matched === null) continue;

    var series = metrics.timers[key];
    for (keyTimer in series) {
      array_timers.push(extend({
        "val": series[keyTimer],
        "@timestamp": ts
      }, matched.captures));
    }
  }

  for (key in metrics.timer_data) {
    matched = keyRegex.exec(key);
    if (matched === null) continue;

    var value = extend(metrics.timer_data[key], matched.captures);

    value["@timestamp"] = ts;

    if (value['histogram']) {
      for (var keyH in value['histogram']) {
        value[keyH] = value['histogram'][keyH];
      }
      delete value['histogram'];
    }
    array_timer_data.push(value);
    numStats += 1;
  }

/*
  for (key in gauges) {
    message_array.push(create_json(key + '.gauges' , gauges[key],ts));
    numStats += 1;
  }
*/
  if (debug) {
    lg.log('metrics:');
    lg.log( JSON.stringify(metrics) );
  }

  es_bulk_insert(array_counts, array_timers, array_timer_data);

  if (debug) {
    lg.log("debug", "flushed " + numStats + " stats to ES");
  }
};

var elastic_backend_status = function (writeCb) {
  for (stat in elasticStats) {
    writeCb(null, 'elastic', stat, elasticStats[stat]);
  }
};

exports.init = function elasticsearch_init(startup_time, config, events, logger) {

  debug = config.debug;

  var configEs = config.elasticsearch || { };

  // To include everything after the third dot in act use:
  // /^(:<ns>[^.]+)\.(:<grp>[^.]+)\.(:<tgt>[^.]+)(?:\.(:<act>.+))?/
  keyRegex              = named(configEs.keyRegex) || named(/^(:<ns>[^.]+)\.(:<grp>[^.]+)\.(:<tgt>[^.]+)(?:\.(:<act>[^.]+))?/);  
  elasticHost           = configEs.host            || 'localhost';
  elasticPort           = configEs.port            || 9200;
  elasticPath           = configEs.path            || '/';
  elasticIndex          = configEs.indexPrefix     || 'statsd';
  elasticIndexTimestamp = configEs.indexTimestamp  || 'day';
  elasticCountType      = configEs.countType       || 'counter';
  elasticTimerType      = configEs.timerType       || 'timer';
  elasticTimerDataType  = configEs.timerDataType   || elasticTimerType + '_stats';
  flushInterval         = config.flushInterval;

  elasticStats.last_flush = startup_time;
  elasticStats.last_exception = startup_time;
  lg = logger;


  events.on('flush', flush_stats);
  events.on('status', elastic_backend_status);

  return true;
};

