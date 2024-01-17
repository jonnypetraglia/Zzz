// import { basename, extname } from "path";
import { Collection, Entity, Model, ModelType, Scope, StringToStringMap } from "../core/models.ts";
import { extname } from "https://deno.land/std/path/mod.ts";
import tim from "../core/tim.ts";
import { DefaultFlags } from "../core/flags.ts";
import { Driver, getContentType, getDriver } from "../stores/files/drivers.ts";
import Application, { IActor, IStore } from "../core/app.ts";
import Log from "../core/log.ts";
import VariablesModule from "../modules/variables/index.ts";
import PathParamsModule from "../modules/path-params/index.ts";

interface IServer {
  // respond(code: number, body: any, headers: StringToStringMap): any;
  listen(): void;
}

const STANDARD_HEADERS = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "allow,content-type,x-zzz-context", "Access-Control-Allow-Methods": "GET,PATCH" };

export class Server implements IServer {
  port: number;
  app: Application;
  constructor(app: Application) {
    this.port = app.argv.http || DefaultFlags.HTTP_PORT;
    this.app = app;
  }
  respond(request: Request): Promise<Response> {
    Log("Responding to " + request.method, request.url);
    switch (request.method) {
      case "GET":
        return this.respondToGet(request);
      case "PATCH":
        return this.respondToPatch(request);
      case "OPTIONS":
        return Promise.resolve(this._handleOptions(request));
      default:
        return Promise.reject(
          new Response("Unsupported request method: " + request.method, {
            status: 400,
            headers: STANDARD_HEADERS,
          }),
        );
    }
  }
  listen(): void {
    const pls = this;
    function cb(request: Request): Promise<Response> {
      return pls.respond(request).catch((error: any) => {
        if (error instanceof Response) {
          return Promise.resolve(error);
        }
        return Promise.resolve(newResponse(400, error, STANDARD_HEADERS));
      });
    }
    Deno.serve({ port: this.port }, cb);
  }

  async respondToGet(request: Request): Promise<Response> {
    const { pathname: url } = new URL(request.url);
    if (url === "/favicon.ico") {
      return newResponse(204, null, STANDARD_HEADERS);
    }
    if (url === "/") {
      return this.respondToScopesList();
    }
    return this._do(request, "Pass").then((result: Entity | Scope) => this._respond(result, "Pass"));
  }
  respondToPatch(request: Request): Promise<Response> {
    return this._do(request, "Client").then((result: Entity | Scope) => {
      return this._respond(result, "Client");
    });
  }
  _handleOptions(request: Request): Response {
    const headers = {
      "Allow": ["OPTIONS", "GET"],
      ...STANDARD_HEADERS,
    };
    if (request.url !== "/") {
      headers.Allow.push("PATCH}");
    }
    return new Response(null, {
      status: 204,
      headers: headers as any,
    });
  }
  async respondToScopesList(): Promise<Response> {
    const scopes = await (await this.app.getStore()).list(ModelType.Scope);
    const scopeIds = scopes.map((scope: Model) => scope.Id);
    return newResponse(200, this.stringify(scopeIds), STANDARD_HEADERS);
  }
  async _do(request: Request, actorName: string): Promise<Entity | Scope> {
    const { scope, context, entityId, extension, fullId } = dissectRequest(request);
    console.log("Parts:", scope, context, entityId, extension);
    const store = await this.app.getStore();
    const { searchParams } = new URL(request.url);
    const isResolve = searchParams.has("resolve");
    const isFormat = searchParams.has("format") || actorName == "Client";
    function getModelType(entityId: string): ModelType {
      if (!entityId) {
        return ModelType.Scope;
      }
      if (extension) {
        return ModelType.Entity;
      }
      return ModelType.Collection;
    }
    const modelType = getModelType(entityId);
    console.log("Dealing with", ModelType[modelType], entityId);
    // @ts-ignore: ignore
    return store.get(modelType, fullId)
      .then((result: Entity) => {
        return this.app.applyModules(result).then(() => result);
      })
      .then((entity: Entity) => {
        if (isResolve || isFormat) {
          return VariablesModule.newInstance(this.app).load(entity, context)
            .then((variables) => {
              if (isResolve) {
                entity.Variables = variables;
              }
              if (isFormat) {
                tim(entity, variables);
              }
              return entity;
            });
        }
        return entity;
      })
      // @ts-ignore: ignore
      .then((entity: Entity) => {
        if (isFormat) {
          return PathParamsModule.newInstance(this.app).mod(entity as Entity, this.app.config);
        }
        return entity;
      });
  }
  _respond(theRequest: Entity | Scope, actorName: string): Promise<Response> {
    return this.app.getActor(actorName).then((actor: IActor) => {
      console.log("acting");
      if (theRequest instanceof Entity) {
        return actor.act(theRequest);
      }
      return Promise.resolve(theRequest);
    })
      .then((result: any) => {
        Log("Final response", result);
        let finalResponse = result;
        if (!(result instanceof Response)) {
          finalResponse = newResponse(200, this.stringify(result), STANDARD_HEADERS);
        }
        return finalResponse;
      })
      .catch((reason: any) => {
        console.error(reason.message);
        console.error(reason);
        console.error(reason.stacktrace);
        return newResponse(500, reason, STANDARD_HEADERS);
      });
  }
  stringify(result: any): string {
    return getDriver(".json").stringify(result);
  }
}

function newResponse(status: number, body: any, headers: StringToStringMap): Response {
  return new Response(body, { status, headers });
}
function dissectRequest(request: Request): RequestParts {
  const { searchParams, pathname } = new URL(request.url);
  const extension = extname(pathname);
  const decodedPathname = decodeURI(pathname.replace(/^\//, ""));
  const scope = decodedPathname.split("/")[0];
  const entityId = decodedPathname.substring(scope.length + 1, decodedPathname.length - extension.length).replace(/^\./, "");
  const context = searchParams.get("context") || request.headers?.get("x-zzz-context") || "";
  return {
    context,
    scope,
    entityId,
    extension,
    fullId: (entityId ? (scope + "/" + entityId) : scope),
  };
}
type RequestParts = {
  context: string;
  entityId: string;
  scope: string;
  extension: string;
  fullId: string;
};
