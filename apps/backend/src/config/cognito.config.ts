export const CognitoConfig = {
  userPoolId: process.env.COGNITO_USER_POOL_ID || "",
  userPoolClientId: process.env.COGNITO_USER_POOL_CLIENT_ID || "",
  region: process.env.AWS_REGION || "us-east-1",
  issuer: process.env.COGNITO_ISSUER || undefined, // optional override
};

export function getJwksUri() {
  if (CognitoConfig.issuer)
    return `${CognitoConfig.issuer}/.well-known/jwks.json`;
  if (CognitoConfig.userPoolId && CognitoConfig.region)
    return `https://cognito-idp.${CognitoConfig.region}.amazonaws.com/${CognitoConfig.userPoolId}/.well-known/jwks.json`;
  return undefined;
}
