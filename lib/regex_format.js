/*

Remember that setting a new regix in the config for statsd uses
a native regular expression data type, not a string!
*/
var named   = require('named-regexp').named
  , extend  = require('util')._extend;

var keyRegex;

var init = function(config) {
	keyRegex = named(config.keyRegex || /^(:<ns>[^.]+)\.(:<grp>[^.]+)\.(:<tgt>[^.]+)(?:\.(:<act>[^.]+))?/);
}

var counters = function (key, value, ts, bucket) {
    var matched = keyRegex.exec(key);
    if (matched === null) return 0;

    bucket.push(extend(matched.captures, {
      "val": value,
      "@timestamp": ts
    }));
	return 1;
}

var timers = function (key, series, ts, bucket) {
    var matched = keyRegex.exec(key);
    if (matched === null) return 0;
    for (keyTimer in series) {
      bucket.push(extend({
        "val": series[keyTimer],
        "@timestamp": ts
      }, matched.captures));
    }
	return series.length;
}

var timer_data = function (key, value, ts, bucket) {
    var matched = keyRegex.exec(key);
    if (matched === null) return;

    var value = extend(value, matched.captures);

    value["@timestamp"] = ts;
    if (value['histogram']) {
      for (var keyH in value['histogram']) {
        value[keyH] = value['histogram'][keyH];
      }
      delete value['histogram'];
    }
    bucket.push(value);
}

exports.counters   = counters;
exports.gauges     = counters;
exports.timers     = timers;
exports.timer_data = timer_data;
exports.init       = init;
