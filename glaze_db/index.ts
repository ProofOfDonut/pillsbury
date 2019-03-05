import {createPostgresClientFromConfigFiles} from '../lib/postgres';
import {GlazeDbClient} from './client';

export {GlazeDbClient};

export async function createGlazeDbClientFromConfigFiles(
    configFile: string,
    userConfigFile: string,
    dbname: string = ''):
    Promise<GlazeDbClient> {
  return new GlazeDbClient(
      await createPostgresClientFromConfigFiles(
          configFile,
          userConfigFile,
          dbname));
}
