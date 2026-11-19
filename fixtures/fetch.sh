#!/bin/sh
# Downloads the test demos. deadem.com serves them only with a browser-like Referer and User-Agent.
set -e
cd "$(dirname "$0")"
for demo in 100576005-6679; do
    [ -f "$demo.dem" ] || curl -fL -o "$demo.dem" \
        -H "Referer: https://deadem.com/" -H "User-Agent: Mozilla/5.0" \
        "https://deadem.com/demos/deadlock/$demo.dem"
done
