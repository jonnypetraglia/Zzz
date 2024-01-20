import { HttpRequest } from "../requests/mod.ts";
import { AuthType, IAuthorizer } from "./mod.ts";

export class BearerTokenAuthorizer implements IAuthorizer {
  authorize(theRequest: HttpRequest, token: BearerToken): void {
    theRequest.Headers["Authorization"] = `Bearer ${token}`;
  }
}

export type BearerToken = AuthType & string;
