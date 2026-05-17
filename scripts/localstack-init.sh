#!/usr/bin/env sh
set -eu

TOPIC_NAME=${SNS_TASK_ASSIGN_TOPIC_NAME:-cirrusboard-task-assign}
QUEUE_NAME=${SQS_TASK_ASSIGN_QUEUE_NAME:-cirrusboard-task-assign-queue}

TOPIC_ARN=$(awslocal sns create-topic --name "$TOPIC_NAME" --query 'TopicArn' --output text)

awslocal sqs create-queue --queue-name "$QUEUE_NAME" >/dev/null
QUEUE_URL=$(awslocal sqs get-queue-url --queue-name "$QUEUE_NAME" --query 'QueueUrl' --output text)
QUEUE_ARN=$(awslocal sqs get-queue-attributes --queue-url "$QUEUE_URL" --attribute-names QueueArn --query 'Attributes.QueueArn' --output text)

POLICY=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowSnsPublish",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "sqs:SendMessage",
      "Resource": "$QUEUE_ARN",
      "Condition": {
        "ArnEquals": {"aws:SourceArn": "$TOPIC_ARN"}
      }
    }
  ]
}
EOF
)

awslocal sqs set-queue-attributes --queue-url "$QUEUE_URL" --attributes Policy="$POLICY"
awslocal sns subscribe --topic-arn "$TOPIC_ARN" --protocol sqs --notification-endpoint "$QUEUE_ARN" >/dev/null

echo "LocalStack SNS/SQS ready: topic=$TOPIC_ARN queue=$QUEUE_URL"
