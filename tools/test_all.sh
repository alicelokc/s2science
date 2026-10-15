#!/bin/sh
# Run before every push or deploy. Stops on the first failure.
set -e
cd "$(dirname "$0")/.."
node tools/test_server.js
node tools/test_client.js
