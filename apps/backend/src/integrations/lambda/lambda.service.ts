import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import { getAwsClientOptions } from "../../config/aws.config";

export class LambdaService {
  private client = new LambdaClient(getAwsClientOptions());

  async invoke(
    functionName: string,
    payload: any,
    invocationType = "RequestResponse",
  ) {
    const cmd = new InvokeCommand({
      FunctionName: functionName,
      Payload: Buffer.from(JSON.stringify(payload)),
      InvocationType: invocationType as any,
    });
    const res = await this.client.send(cmd);
    return res;
  }
}
