import { encode64 } from "https://deno.land/x/base64to@v0.0.2/mod.ts";
import { IAuthorization } from "../authorizer.ts";
import Request from "../request.ts";

export default class BasicAuthAuthorizer implements IAuthorization {
  apply(theRequest: Request, authorizationConfig: Config): void {
    theRequest.Headers["Authorization"] = "Basic " + encode64(authorizationConfig.Username + authorizationConfig.Password);
  }
}
interface Config {
  Username: string;
  Password: string;
}