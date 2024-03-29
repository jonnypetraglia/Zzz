import Construct from "./constructor";
import Authorize from "./authorizer";
import Act from "./actor";

const request = 'requests/mess/v1/send/Send Emails.yml';
const environment = 'Integrate';
const authDefinition = 'BearerToken';
const actor = 'Summary';

const letter = Construct(request, environment);
Authorize(letter, authDefinition);
Act(letter, actor);