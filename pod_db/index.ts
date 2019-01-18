import {createPostgresClientFromConfigFile} from '../lib/postgres';
import {PodDbClient} from './client';

export {PodDbClient};

export async function createPodDbClientFromConfigFile(
    configFile: string,
    dbname: string = ''):
    Promise<PodDbClient> {
  return new PodDbClient(
      await createPostgresClientFromConfigFile(
          configFile,
          dbname));
}
