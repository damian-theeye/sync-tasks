#!/bin/bash
echo "debuging aws"
curl 169.254.170.2$AWS_CONTAINER_CREDENTIALS_RELATIVE_URI
echo "fetching config files"
aws s3 cp s3://theeye-internal/production/config/sync-tasks.js ./server/config/index.js --region us-east-1
echo "validating..."
ls ./server/config/
npm run start
