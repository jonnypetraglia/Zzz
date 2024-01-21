import { Args } from "https://deno.land/std/cli/parse_args.ts";
import { Action, StringToStringMap } from "../lib/lib.ts";
import { IStorage, Model } from "../storage/mod.ts";
import { IModuleRenderer, Module } from "../lib/module.ts";

export default interface IApplication {
  store: IStorage;
  flags: Flags;
  argv?: Args; // TODO: Should not be optional but needs to wait to be loaded until after registerModule has been called
  feature: FeatureMap;
  env: StringToStringMap;
  // modules: Module[];
  // renderers: IModuleRenderer[];
  registerModule(module: Module): void;
  executeModules(action: Action, model: Model): Promise<void>;
}
export type ConfigValue = string | boolean | number;

export type Flags = {
  preamble: string;
  string: string[];
  boolean: string[];
  description: StringToStringMap;
  argument: { [key: string]: string };
  default: { [key: string]: ConfigValue };
  alias: StringToStringMap;
};
export type FeatureFlagValue = string | boolean | number;
export type FeatureFlags = { [key: string]: FeatureFlagValue };

export type FeatureMap = { [key: string]: ConfigValue };
