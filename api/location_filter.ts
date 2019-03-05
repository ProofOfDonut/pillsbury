import {Request, Response} from 'express';
import {lookup as geoIpLookup} from 'geoip-lite';
import {
  ensure, ensureArray, ensureObject, ensurePropString, ensureString,
} from '../common/ensure';

function ALLOW_ALL() {
  return true;
}

export function filterConfigToExpressMiddleware(config: any) {
  return createFilterRequestFunction(filterConfigToDecider(config));
}

function createFilterRequestFunction(
    allow: (geoInfo: Object) => boolean):
    (req: Request, res: Response, next: () => void) => void {
  return (req: Request, res: Response, next: () => void) => {
    const geoInfo = geoIpLookup(req['ip']);
    if (geoInfo && !allow(geoInfo)) {
      res.status(451).end();
      return;
    }
    next();
  };
}

function filterConfigToDecider(config: any): (geoInfo: Object) => boolean {
  if (!config) {
    return ALLOW_ALL;
  }
  const filters = ensureArray(config);
  const filterFunctions = <((geoInfo: Object) => boolean)[]>[];
  for (const filter of filters) {
    const f = ensureObject(filter);
    const country = ensurePropString(f, 'country');
    const region = f['region'] ? ensurePropString(f, 'region') : '';
    ensure(country, 'Country must be provided in request filter.');
    filterFunctions.push(createGeoFilter(country, region));
  }
  if (filterFunctions.length == 0) {
    return ALLOW_ALL;
  }
  return (geoInfo: Object) => filterFunctions.every(fn => fn(geoInfo));
}

function createGeoFilter(
    filterCountry: string,
    filterRegion: string):
    (geoInfo: Object) => boolean {
  const fCountry = filterCountry.toLowerCase();
  const fRegion = filterRegion.toLowerCase();
  return (geoInfo: Object) => {
    if (!geoInfo) {
      return true;
    }
    let userCountry = geoInfo['country'];
    if (!userCountry) {
      return true;
    }
    userCountry = userCountry.toLowerCase();
    if (userCountry == fCountry) {
      return false;
    }
    let userRegion = geoInfo['region'];
    if (!userRegion) {
      return true;
    }
    userRegion = userRegion.toLowerCase();
    if (userRegion == fRegion) {
      return false;
    }
    return true;
  };
}
