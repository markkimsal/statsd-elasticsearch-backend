#!/bin/bash
echo "accounts.authentication.password.failed:1|c" | nc -u -w0 127.0.0.1 8125
echo "accounts.authentication.login.time:320|ms|@0.1" | nc -u -w0 127.0.0.1 8125
echo "accounts.authentication.login.num_users:333|g" | nc -u -w0 127.0.0.1 8125
echo "accounts.authentication.login.num_users:-10|g" | nc -u -w0 127.0.0.1 8125

