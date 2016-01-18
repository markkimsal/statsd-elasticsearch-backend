statsd-elasticsearch-backend
============================

Elasticsearch backend for statsd

## Overview

This backend allows [Statsd][statsd] to save to [Elasticsearch][elasticsearch].  Supports dynamic index creation per day and follows the logstash naming convention of statsd-YYYY.MM.DD for index creation.

## History 

Originally written by Github user rameshpy, this library was created as a feature branch of etsy/statsd.  The statsd project recommended that this library be converted to its own repository as all other backends currently do.  This repository started as a restructuring of the existing feature branch into a standalone backend repository.

## Installation

    $ cd /path/to/statsd
    $ npm install git://github.com/markkimsal/statsd-elasticsearch-backend.git
    
To install from behind a proxy server:

    $ export https_proxy=http://your.proxyserver.org:8080
    $ export http_proxy=http://your.proxyserver.org:8080
    $ cd /path/to/statsd
    $ npm install git+https://github.com/markkimsal/statsd-elasticsearch-backend.git


## Configuration

Merge the following configuration into your top-level existing configuration.
Add a structure to your configuration called "elasticsearch"

```js

 backends: [ 'statsd-elasticsearch-backend', 'other-backends'],
 debug: true,
 elasticsearch: {
	 port:          9200,
	 host:          "localhost",
	 path:          "/",
	 indexPrefix:   "statsd",
	 //indexTimestamp: "year",  //for index statsd-2015 
	 //indexTimestamp: "month", //for index statsd-2015.01
	 indexTimestamp: "day",     //for index statsd-2015.01.01
	 countType:     "counter",
	 timerType:     "timer",
	 timerDataType: "timer_data",
	 gaugeDataType: "gauge",
     formatter:     "default_format"
 }
```

The field _path_ is equal to "/" if you directly connect to ES. 
But when ES is on behind the proxy (nginx,haproxy), for example http://domain.com/elastic-proxy/, then following settings required:
```
    port: 80,
    host: "domain.com",
    path: "/elastic-proxy/",
```
Nginx config proxy example:
```
    location /elastic-proxy/ {
        proxy_pass http://localhost:9200/;
    }
```

The field _indexPrefix_ is used as the prefix for your dynamic indices: for example "statsd-2014.02.04"

The field _indexTimestamp_ allows you to determine the timestamping for your dynamic index. "year", "month" and "day" would produce "statsd-2014", "statsd-2014.02", "statsd-2014.02.04" respectively.

The type configuration options allow you to specify different elasticsearch \_types for each statsd measurement.

## Important upgrade from 0.2 to 0.3

Previously, the config value for timerDataType was always ignored and timer data was alwasy saved as the timerType + '\_stats'.  If you are upgrading a live instance from 0.2 please be aware that the value of timerDataType will now be respected and you should ensure that you have the proper type mappings (especially for @timestamp) or that your timerDataType is set to timerType + '\_stats'.

In addition to the above, the value of timerDataType was always overwriting timerData, so all timer information was being saved to the type "timer\_data" when the sample configuration would lead you to believe that it was being saved to the type "timer".

In summary, the ES \_types of "timer_data" and "timer_data_stats" will now be "timer" and "timer_data" if the sample configuration is used.

## Template Mapping (basically required)

To configure Elasticsearch to automatically apply index template settings based on a naming pattern look at the es-index-template.sh file.  It will probably need customization (the timer_data type) for your particular statsd configuration (re: threshold pct and bins).

From your etc/statsd installation type the following to get the basic template mapping
```
sh  node_modules/statsd-elasticsearch-backend/es-index-template.sh
# if your ES is on another machine or port
ES_HOST=10.1.10.200 ES_PORT=9201 sh node_modules/statsd-elasticsearch-backend/es-index-template.sh
```
Without this, your timestamps will not be interpreted as timestamps.

## Test your installation

Send a UDP packet that statsd understands with netcat.

```
echo "accounts.authentication.password.failed:1|c" | nc -u -w0 127.0.0.1 8125
echo "accounts.authentication.login.time:320|ms|@0.1" | nc -u -w0 127.0.0.1 8125
echo "accounts.authentication.login.num_users:333|g" | nc -u -w0 127.0.0.1 8125
echo "accounts.authentication.login.num_users:-10|g" | nc -u -w0 127.0.0.1 8125
```

## Default Metric Name Mapping

Each key sent to the elasticsearch backend will be broken up by dots (.) and each part of the key will be treated as a document property in elastic search.  The first for keys will be treated as namespace, group, target, and action, with any remaining keys concatenated into the "action" key with dots.
For example:

```js
accounts.authentication.password.failure.count:1|c
```

The above would be mapped into a JSON document like this:
```js
{
	"_type":"counter",
	"ns":"accounts",
	"grp":"authentication",
	"tgt":"password",
	"act":"failure.count",
	"val":"1",
	"@timestamp":"1393853783000"
}
```

Currently the keys are hardcoded to: namespace, group, target, and action, as in the above example.  Having configurable naming conventions is the goal of a 1.0 release.
The idea for mapping came mostly from: [http://matt.aimonetti.net/posts/2013/06/26/practical-guide-to-graphite-monitoring/]

## Configurable Metric Formatters

As of 0.4.0 you can now choose to use from a selection of metric key formatters or write your own.

The config value _formatter_ will resolve to the name of a file under lib/ with a .js extension added to it.

````
formatter:  my_own_format  # this will require ('lib/' + 'my_own_format' + '.js);
```
In this module you will need to export a number of functions.  The 4 that are supported right now are:
```
counters( key, value, ts, array )
timers( key, value, ts, array )
timer_data( key, value, ts, array )
gauges( key, value, ts, array )
```

Look at lib/default\_format.js for a template to build your own.
