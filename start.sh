#!/bin/bash
wget "https://theeye-internal.s3.amazonaws.com/production/config/sync-tasks.js"
mv ./sync-tasks.js ./server/config/index.js
echo validating..
ls ./server/config/
npm run start
