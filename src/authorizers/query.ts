import { IAuthorization } from "../authorizer";
import Letter from "../letter";

export default class QueryAuthorizer implements IAuthorization {
    apply(letter: Letter, authorizationConfig: Config): void {
        letter.QueryParams[authorizationConfig.Param] = authorizationConfig.Value;
    }
}
interface Config {
    Param: string;
    Value: string;
}
