// import { basename, extname } from "path";
import { Entity, Model, ModelType, StringToStringMap } from "./core/models.ts";
import tim from "./core/tim.ts";
import { extname } from "https://deno.land/std/path/mod.ts";
import { Load } from "./core/variables.ts";
import { DefaultFlags } from "./core/flags.ts";
import { Args } from "https://deno.land/std/flags/mod.ts";
import { getContentType, getDriver } from "./core/files/drivers.ts";
import Application from "./core/app.ts";

interface IServer {
  respond(code: number, body: any, headers: StringToStringMap): any;
  listen(actorName: string): void;
}

export class Server implements IServer {
  request?: Request;
  port: number;
  app: Application;
  constructor(app: Application) {
    this.port = app.argv.http || DefaultFlags.HTTP_PORT;
    this.app = app;
  }

  listen(actorName: string): void {
    const pls = this;
    const callback = (request: Request): Response => {
      switch (request.method) {
        case "GET":
          console.log("Responding to PGETOST");
          return pls._respond(actorName);
        case "POST":
          console.log("Responding to POST");
          return pls._respond("Client");
        case "OPTIONS":
          console.log("Responding to OPTIONS", request.url);
          return this._handleOptions(request);
        default:
          return new Response("", {
            status: 400,
            headers: getHeaders("application/JSON"),
          });
      }
    };
    Deno.serve({ port: this.port }, callback);
  }
  respond(status: number, body: any, headers: StringToStringMap): Response {
    return new Response(body, { status, headers });
  }
  _handleOptions(request: Request): Response {
    const headers = {
      "Allow": ["OPTIONS", "GET"],
      "Access-Control-Allow-Headers": ["X-Zzz-Workspace"],
      ...getHeaders("application/json"),
    };
    if (request.url !== "/") {
      headers.Allow.push("POST");
    }
    return new Response(null, {
      status: 204,
      headers: headers,
    });
  }
  async _respond(actorName: string = "Pass"): Promise<Response> {
    const url = this.getUrl();
    console.log("Responding to", url);
    if (url === "/favicon.ico") {
      return this.respond(200, {}, {});
    }
    const resourcePath = decodeURI(url.substring(1));
    let base = resourcePath;
    let ext = extname(resourcePath);
    if (ext.startsWith(".")) {
      ext = ext.substring(1);
      base = base.substring(0, base.length - ext.length - 1);
    }
    if ((base as string).endsWith("/")) {
      base = base.substring(0, base.length - 1);
    }
    const contentType = getContentType(resourcePath);
    console.log("Received request", this.getMethod(), "base=" + base, resourcePath, contentType);

    if (base === "") {
      const whatever = await this.app.get(ModelType.Collection);
      this.Collections();
      return this.respond(200, JSON.stringify(whatever, null, 2), getHeaders(contentType));
    }
    return Get(ModelType.Entity, base, "integrate")
      .then((result: Model) => {
        if (result.Type === "Entity") {
          return Load(result as Entity, "integrate", Stores.YAML); // TODO Hardcoded
        } else {
          return result;
        }
      })
      .then((result: Model) => {
        const theRequest = result as Entity;
        theRequest.Method = this.getMethod(); // TODO: HATE THIS
        if (this.getQueryParams().has("format") || this.getMethod() === "POST") {
          tim(theRequest, theRequest.Variables);
        }
        if (ext === "curl") {
          // TODO: Hardcoded
          return Act(theRequest, "Curl");
        }
        return Act(theRequest, actorName);
      })
      .then((result) => {
        const parser = getDriver(resourcePath);
        const parsedResult = parser.stringify(result);
        return server.respond(200, parsedResult, { "Content-Type": contentType, "Access-Control-Allow-Origin": "*" });
      })
      .catch((reason) => {
        console.error(reason.message);
        console.error(reason);
        const parser = getDriver(resourcePath);
        const parsedResult = parser.stringify(reason);
        console.error(parsedResult);
        return server.respond(500, parsedResult, { "Content-Type": contentType, "Access-Control-Allow-Origin": "*" });
      });
  }
}
function getHeaders(contentType: string): any {
  return { "Content-Type": contentType, "Access-Control-Allow-Origin": "*" };
}
