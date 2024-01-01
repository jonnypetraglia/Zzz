// import { basename, extname } from "path";
import ZzzRequest, { StringToStringMap } from "./request.ts";
import { Collections, EntityType, Get, Stat } from "./store.ts";
import { AppConfig } from "../main.ts";
import tim from "./tim.ts";
import Act from "./actor.ts";
import { extname } from "https://deno.land/std/path/mod.ts";
import { Parser, Parsers } from "./format.ts";

export interface IServer {
  getUrl(): string;
  getMethod(): string;
  respond(code: number, body: any, headers: StringToStringMap): any;
  listen(responder: Function): void; // TODO: This responder junk is a hideous indirection of control
}

export default function Serve(appConfig: AppConfig, actorName: string = "Pass") {
  new Server().listen((server: IServer) => {
    return respond(server, actorName);
  });
}

export class Server implements IServer {
  request: Request | null = null;
  respond(status: number, body: any, headers: StringToStringMap): Response {
    return new Response(body, { status, headers });
  }
  getUrl(): string {
    return new URL(this.request!.url).pathname.substring(0);
  }
  getMethod(): string {
    return this.request!.method;
  }
  listen(responder: Function): void {
    const HTTP_PORT = Deno.env.get("PORT") as number | undefined || 8000;
    Deno.serve({ port: HTTP_PORT }, (request: Request): Response => {
      this.request = request;
      return responder(this);
    });
  }
}

async function respond(server: IServer, actorName: string = "Pass") {
  const method = server.getMethod();
  const url = server.getUrl();
  if (url === "/favicon.ico") {
    return server.respond(200, {}, {});
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
  console.log("base", base);
  const contentType = getContentType(resourcePath);
  console.log("Received request", method, resourcePath, contentType);

  if (base === "") {
    const whatever = await Collections();
    return server.respond(200, JSON.stringify(whatever, null, 2), { "Content-Type": contentType, "Access-Control-Allow-Origin": "*" });
  }
  return Stat(base)
    .then((stats) => {
      switch (stats.Type) {
        case "Request":
          return Get(EntityType.Request, base, "Integrate");
        case "Collection":
          return Get(EntityType.Collection, base, "Integrate");
        case "Folder":
          return Get(EntityType.Folder, base, "Integrate");
        // case "Environment":
        //   return Get(EntityType.Environment, base, "Integrate");
        // case "Authorization":
        //   return Get(EntityType.Authorization, base, "Integrate");
        default:
          throw new Error(`Unsupported type of entity for Stat: ${stats.Type}`);
      }
    })
    .then((result) => {
      const theRequest = result as ZzzRequest;
      tim(theRequest, theRequest.Variables);
      if (ext === "curl") {
        // TODO: Hardcoded
        return Act(theRequest, "Curl");
      }
      return Act(theRequest, actorName);
    })
    .then((result) => {
      console.log("result2", result);
      const parser = getParser(resourcePath);
      const parsedResult = parser.stringify(result);
      return server.respond(200, parsedResult, { "Content-Type": contentType, "Access-Control-Allow-Origin": "*" });
    })
    .catch((reason) => {
      console.error(reason.message);
      console.error(reason);
      const parser = getParser(resourcePath);
      const parsedResult = parser.stringify(reason);
      console.error(parsedResult);
      return server.respond(500, parsedResult, { "Content-Type": contentType, "Access-Control-Allow-Origin": "*" });
    });
}
function getParser(resourcePath: string): Parser {
  const ext = extname(resourcePath).substring(1).toLowerCase();
  switch (ext) {
    case "json":
    default:
      return Parsers.JSON;
    case "yml":
    case "yaml":
      return Parsers.YAML;
    case "xml":
      return Parsers.XML;
    case "txt":
    case "curl":
      return Parsers.TEXT;
  }
  // throw new Error("No known parser for: " + ext);
}
function getContentType(resourcePath: string): string {
  const ext = extname(resourcePath).substring(1).toLowerCase();
  switch (ext) {
    case "json":
    case "":
      return "application/json";
    case "yml":
    case "yaml":
    case "txt":
    case "curl":
      return "text/plain";
    case "xml":
      return "text/xml";
    default:
      throw new Error('No known content type for extension "' + ext + '"');
  }
}