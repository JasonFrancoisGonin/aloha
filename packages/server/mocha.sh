#!/bin/bash

echo "mocha test " $@
pnpm run test -- "$@"
