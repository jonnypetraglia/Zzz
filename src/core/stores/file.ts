import { existsSync } from "https://deno.land/std/fs/mod.ts";
import { Collection, Entity, Model, ModelType, StringToStringMap } from "../models.ts";
import { basename, extname } from "https://deno.land/std/path/mod.ts";
import { IStore } from "../app.ts";
import { getDriver } from "../files/drivers.ts";
export default class FileStore implements IStore {
  fileExtension: string;
  constructor(fileExtension: string) {
    this.fileExtension = fileExtension;
  }
  async get(modelType: ModelType, entityId: string, context: string): Promise<Model> {
    if (modelType === ModelType.Entity) {
      const requestPath = entityId + "." + this.fileExtension;
      const resultRequest = getDriver(requestPath).parse(Deno.readTextFileSync(requestPath)) as Entity;
      resultRequest.Id = entityId;
      resultRequest.Type = ModelType[modelType];
      if (!resultRequest.Name) {
        resultRequest.Name = basename(entityId);
      }
      return resultRequest;
    } else if (modelType === ModelType.Collection) {
      const item = new (modelType === ModelType.Collection ? Collection : Collection)(entityId, basename(entityId));
      for await (const child of Deno.readDir(entityId)) {
        if (child.isDirectory) {
          item.Children.push(await this.get(ModelType.Collection, `${entityId}/${child.name}`, context));
        } else if (child.isFile && filetypeSupported(child.name) && !excludeFromInfo(child.name)) {
          const baseless = basename(child.name, extname(child.name));
          item.Children.push(await this.get(ModelType.Entity, `${entityId}/${baseless}`, context));
        }
      }
      return item;
    }
    if (modelType === ModelType.Context || modelType === ModelType.Authorization) {
      const entityFolder = getDirectoryForModel(modelType);
      const filePath = `${entityFolder}/${entityId}.${this.fileExtension}`;
      return this._parser().parse(Deno.readTextFileSync(filePath)) as Model; // TODO: Is this a naughty cast?
    }
    throw new Error(`Unknown type of entity: ${modelType}`);
  }
  store(key: string, value: any): Promise<void> {
    const sessionPath = getEnvironmentPath(SESSION_FILE, this.fileExtension);
    let sessionContents = { Variables: {} as StringToStringMap };
    if (existsSync(sessionPath)) {
      sessionContents = this._parser().parse(Deno.readTextFileSync(sessionPath));
    }
    sessionContents.Variables[key] = value;
    Deno.writeTextFileSync(sessionPath, this._parser().stringify(sessionContents));
    return Promise.resolve();
  }
  setContext(context: string): void {
    throw new Error("Not implemented");
  }
  _parser(): Parser {
    return Parsers[this.fileExtension.toUpperCase()];
  }
}

function filetypeSupported(filePath: string): boolean {
  const fileExtension = filePath.substring(filePath.lastIndexOf(".") + 1);
  return Parsers[fileExtension.toUpperCase()] !== undefined;
}
function excludeFromInfo(name: string): boolean {
  return name.startsWith("_");
}
// async function determineType(modelId: string): Promise<ModelType> {
//   if (modelId.startsWith(getDirectoryForModel(ModelType.Authorization))) {
//     return ModelType.Authorization;
//   }
//   if (modelId.startsWith(getDirectoryForModel(ModelType.Context))) {
//     return ModelType.Context;
//   }
//   if (existsSync(modelId, { isFile: true })) {
//     return ModelType.Entity;
//   } else if (modelId.includes("/")) {
//     return ModelType.Collection;
//   }
// }
export function getDirectoryForModel(modelType: ModelType): string {
  switch (modelType) {
    case ModelType.Context:
      return "context";
    case ModelType.Authorization:
      return "authorizations";
    default:
      throw new Error(`Unknown entity type ${ModelType[modelType]}`);
  }
}
