#!/bin/bash
echo "fetching config files"
aws s3 cp s3://theeye-internal/production/config/sync-tasks.js ./server/config/index.js --region us-east-1
echo "validating..."
ls ./server/config/
npm run start
