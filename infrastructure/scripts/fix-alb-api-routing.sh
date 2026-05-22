#!/usr/bin/env bash
# Remove ALB rule that sends /api/* to the backend target group (causes 502 when
# only Next.js + local Nest are deployed on the frontend EC2).
#
# Usage:
#   export AWS_REGION=eu-north-1
#   ./infrastructure/scripts/fix-alb-api-routing.sh cirrusboard-alb

set -euo pipefail

ALB_NAME_PREFIX="${1:-cirrusboard-alb}"
REGION="${AWS_REGION:-eu-north-1}"

command -v aws >/dev/null 2>&1 || {
  echo "aws CLI is required. Install it or fix routing in the AWS Console:"
  echo "  EC2 → Load Balancers → your ALB → Listeners → HTTP:80 → Rules"
  echo "  Delete the rule with path /api/* that forwards to cirrusboard-backend-tg"
  exit 1
}

ALB_ARN=$(aws elbv2 describe-load-balancers --region "$REGION" \
  --query "LoadBalancers[?contains(LoadBalancerName, \`${ALB_NAME_PREFIX}\`)].LoadBalancerArn | [0]" \
  --output text)

if [[ -z "$ALB_ARN" || "$ALB_ARN" == "None" ]]; then
  echo "No load balancer matching ${ALB_NAME_PREFIX} in ${REGION}"
  exit 1
fi

LISTENER_ARN=$(aws elbv2 describe-listeners --region "$REGION" \
  --load-balancer-arn "$ALB_ARN" \
  --query "Listeners[?Port==\`80\`].ListenerArn | [0]" --output text)

echo "ALB: $ALB_ARN"
echo "Listener: $LISTENER_ARN"

RULES=$(aws elbv2 describe-rules --region "$REGION" --listener-arn "$LISTENER_ARN" \
  --query 'Rules[?Priority!=`default`].[RuleArn,Priority,Conditions[0].Values[0]]' --output text)

DELETED=0
while read -r RULE_ARN PRIORITY PATTERN; do
  [[ -z "$RULE_ARN" ]] && continue
  if [[ "$PATTERN" == *"/api"* ]]; then
    echo "Deleting rule priority ${PRIORITY} (${PATTERN}) → ${RULE_ARN}"
    aws elbv2 delete-rule --region "$REGION" --rule-arn "$RULE_ARN"
    DELETED=$((DELETED + 1))
  fi
done <<< "$RULES"

if [[ "$DELETED" -eq 0 ]]; then
  echo "No /api/* listener rule found. Traffic should already go to the frontend target group."
else
  echo "Deleted ${DELETED} rule(s). Wait ~30s, then:"
  echo "  curl -sS -o /dev/null -w '%{http_code}' http://<alb-dns>/api/health"
  echo "Expected: 200 (via Next proxy) if Nest runs on the frontend EC2 at BACKEND_URL."
fi
