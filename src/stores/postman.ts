import * as YAML from "yaml";
import { IStore } from "../store";
import Letter, { AnyNonPromise } from "../letter";
import { EntityType } from "../store";
import fs = require("node:fs");
import FileStore from "./file";

export default class PostmanStore implements IStore {
    collection: CollectionSchema;
    constructor(collectionJsonFilePath) {
        this.collection = JSON.parse(fs.readFileSync(collectionJsonFilePath, "utf8"));
    }
    async get(entityType: EntityType, entityName: string, environmentName: string): Promise<any> {
        if (entityType === EntityType.Request) {
            return await loadLetter(this.collection, entityName, environmentName);
        }
        throw new Error("Method not implemented.");
    }
    async store<T>(key: string, value: AnyNonPromise<T>): Promise<void> {
        throw new Error("Method not implemented.");
    }
}
async function loadLetter(collection: CollectionSchema, requestFilePath: string, environmentName: string): Promise<Letter> {
    const letter = new Letter();
    // TODO: Write this so it cna work recursively
    const [folderName, requestName] = requestFilePath.split("/");
    const folder = collection.item.filter((item) => item.name === folderName)[0];
    const request = folder.item.filter((item) => item.name === requestName)[0].request;
    letter.Method = request.method;
    letter.URL = request.url.raw.split("?")[0];
    if (request.body) {
        letter.Body = request.body.raw;
    }
    for (let header of request.header) {
        letter.Headers[header.key] = header.value;
    }
    for (let query of request.url.query) {
        letter.QueryParams[query.key] = query.value;
    }
    letter.Variables = await loadVariables(requestFilePath, environmentName);
    return letter;
}
async function loadVariables(requestFilePath: string, environmentName: string): Promise<StringToStringMap> {
    const childLetter = (await new FileStore("yml", YAML.parse, YAML.stringify).get(EntityType.Request, requestFilePath, environmentName)) as Letter;
    return childLetter.Variables;
}
interface StringToStringMap {
    [key: string]: string;
}
interface CollectionSchema {
    info: {
        _postman_id: string;
        name: string;
        schema: string;
        _exporter_id: string;
        _collection_link: string;
    };
    item: [
        {
            name: string;
            item: [
                {
                    name: string;
                    request: {
                        method: string;
                        header: [
                            {
                                key: string;
                                value: string;
                                description: string;
                            }
                        ];
                        body: {
                            mode: string;
                            raw: string;
                        };
                        url: {
                            raw: string;
                            protocol: string;
                            host: string[];
                            path: string[];
                            query: [
                                {
                                    key: string;
                                    value: string;
                                }
                            ];
                        };
                        description: string;
                    };
                    response: [];
                }
            ];
        }
    ];
}
