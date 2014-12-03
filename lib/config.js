var argv, config, env, fs, url, yaml, _, _ref;

yaml = require('js-yaml');
url = require('url');
fs = require('fs');
_ = require('underscore');

env = (_ref = process.env.NODE_ENV) != null ? _ref : 'development';

argv = require('optimist').argv;

config = yaml.safeLoad(fs.readFileSync('./config/config.yml', 'utf8'));

if (config == null) {
  throw new Error("No config found for environment " + env + "!");
}

config = _.extend(config, argv);

config.env = env;

config.shutdownTimeout = 2000;

module.exports = config;