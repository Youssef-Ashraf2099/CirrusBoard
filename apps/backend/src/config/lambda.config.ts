export const LambdaConfig = {
  defaultInvokeTimeoutSeconds: Number(
    process.env.LAMBDA_INVOKE_TIMEOUT_SECONDS || 30,
  ),
  region: process.env.AWS_REGION || "us-east-1",
};

export function getLambdaInvokeTimeout() {
  return LambdaConfig.defaultInvokeTimeoutSeconds;
}
