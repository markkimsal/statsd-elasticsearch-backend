statsd-elasticsearch-backend
============================

Elasticsearch backend for statsd

## Overview

This backend allows [Statsd][statsd] to save to [Elasticsearch][elasticsearch].  Supports dynamic index creation per day and follows the logstash naming convention of statsd-YYYY.MM.DD for index creation (TODO).

## History 

Originally written by Github user rameshpy, this library was created as a feature branch of etsy/statsd.  The statsd project recommended that this library be converted to its own repository as all other backends currently do.  This repository started as a restructuring of the existing feature branch into a standalone backend repository.

## Installation

    $ cd /path/to/statsd
    $ npm install statsd-elasticsearch-backend

## Configuration

Merge the following configuration into your top-level existing configuration.

```js
{
   elasticPort: 9200
 , elasticHost: "localhost"
 , elasticFlushInterval: 10000
 , elasticIndex: "statsd"
 , elasticIndexType: "stats"
 , backends: ['statsd-elasticsearch-backend']
}
```
