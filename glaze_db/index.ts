import {createPostgresClientFromConfigFile} from '../lib/postgres';
import {GlazeDbClient} from './client';

export {GlazeDbClient};

export async function createGlazeDbClientFromConfigFile(
    configFile: string,
    dbname: string = ''):
    Promise<GlazeDbClient> {
  return new GlazeDbClient(
      await createPostgresClientFromConfigFile(
          configFile,
          dbname));
}
