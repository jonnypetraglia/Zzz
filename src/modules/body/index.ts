import Application from "../../core/app.ts";
import { Entity, Model } from "../../core/models.ts";
import { IModule, ModuleConfig } from "../manager.ts";

export default class BodyModule implements IModule {
  static newInstance(app: Application): IModule {
    return new BodyModule();
  }
  async mod(request: Request, entity: Model): Promise<void> {
    if (entity.Type == "Entity") {
      await this.loadBody(entity as Entity, entity.Id);
    }
  }
  loadBody(entity: Entity, _requestFilePath: string): Promise<void> {
    if (typeof entity.Body === "string") {
      entity.Body = JSON.parse(entity.Body);
    }
    if (!entity.Body) {
      entity.Body = null;
    }
    return Promise.resolve();
  }
}
