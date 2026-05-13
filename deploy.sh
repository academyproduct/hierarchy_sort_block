#!/bin/bash
set -euo pipefail

STACK_NAME="hierarchy-sorter"
REGION="${AWS_REGION:-us-east-1}"

echo "==> Deploying CloudFormation stack..."
aws cloudformation deploy \
  --template-file template.yaml \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --no-fail-on-empty-changeset

echo "==> Getting outputs..."
BUCKET=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --query "Stacks[0].Outputs[?OutputKey=='BucketName'].OutputValue" \
  --output text)

DIST_ID=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --query "Stacks[0].Outputs[?OutputKey=='DistributionId'].OutputValue" \
  --output text)

SITE_URL=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --query "Stacks[0].Outputs[?OutputKey=='SiteUrl'].OutputValue" \
  --output text)

echo "==> Syncing files to S3..."
aws s3 sync . "s3://$BUCKET" \
  --region "$REGION" \
  --exclude ".git/*" \
  --exclude "template.yaml" \
  --exclude "deploy.sh" \
  --exclude "README.md" \
  --delete

echo "==> Invalidating CloudFront cache..."
aws cloudfront create-invalidation \
  --distribution-id "$DIST_ID" \
  --paths "/*" \
  --query "Invalidation.Id" \
  --output text

echo ""
echo "✓ Deployed successfully!"
echo "  URL: $SITE_URL"
