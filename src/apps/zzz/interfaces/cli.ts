import { Action, Log, Trace } from "../../../lib/etc.ts";
import { getFileFormat } from "../../../storage/files/formats.ts";
import IApplication, { executeModules, FeatureFlags } from "../../mod.ts";
import { HttpRequest } from "../modules/requests/mod.ts";

export default async function Cli(app: IApplication): Promise<void> {
  const flagValues = app.argv as FeatureFlags;
  Trace("Flag values:", flagValues);
  const action = new Action(flagValues, app.env);
  const model = new HttpRequest();
  try {
    await executeModules(app.modules, action, model);
  } catch (error) {
    Log(error);
    Deno.exit(1);
  }
  Trace("result", model);
  console.info(getFileFormat(".json").stringify(model));
}
