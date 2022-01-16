import metadata from "./metadata";

export class ConfigService {
  public get(configName: string): string {
    const config = metadata.find((c) => c.name === configName);
    const envName = config ? config.envName : null;
    const value = envName && process.env[envName] ? process.env[envName] : null;
    return value || "";
  }
}
