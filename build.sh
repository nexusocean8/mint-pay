#!/bin/bash

docker build -f apps/api/Dockerfile -t code.nexusocean.org/vincent/mint-api:latest .
docker build -f apps/web/Dockerfile -t code.nexusocean.org/vincent/mint-admin:latest .

docker system prune -a