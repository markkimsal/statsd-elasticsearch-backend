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

## Configuration

Merge the following configuration into your top-level existing configuration.
Add a structure to your configuration called "elasticsearch"

```js

 elasticsearch: {
	 port:          9200,
	 host:          "localhost",
	 path:          "/",
	 indexPrefix:   "statsd",
	 countType:     "counter",
	 timerType:     "timer",
	 timerDataType: "timer_data"
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

The type configuration options allow you to specify different elasticsearch _types for each statsd measurement.

To configure Elasticsearch to automatically apply index template settings based on a naming pattern look at the es-index-template.sh file.  It will probably need customization (the timer_data type) for your particular statsd configuration (re: threshold pct and bins).

## Metric Name Mapping

Each key sent to the elasticsearch backend will be broken up by dots (.) and each part of the key will be treated as a document property in elastic search.
For example:

```js
accounts.authentication.password.failed:1|c
```

The above would be mapped into a JSON document like this:
```js
{
	"_type":"counter",
	"ns":"accounts",
	"grp":"authentication",
	"tgt":"password",
	"act":"failed",
	"val":"1",
	"@timestamp":"1393853783000"
}
```

Currently the keys are hardcoded to: namespace, group, target, and action, as in the above example.  Having configurable naming conventions is the goal of a 1.0 release.
The idea for mapping came mostly from: [http://matt.aimonetti.net/posts/2013/06/26/practical-guide-to-graphite-monitoring/]

