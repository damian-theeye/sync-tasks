accessToken=$(curl -s -X POST http://facugon:facugon102030@127.0.0.1:6080/api/auth/login?customer=demo | jq -r '.access_token')

curl -X POST "http://127.0.0.1:6081/demo/task/5eed9ca969034351bc6bf064/job?access_token=${accessToken}"
