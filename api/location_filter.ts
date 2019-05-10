import {Request, Response} from 'express';
import {lookup as geoIpLookup} from 'geoip-lite';
import {
  ensure,
  ensureObject,
  ensurePropArray,
  ensurePropString,
  ensureString,
} from '../common/ensure';

function ALLOW_ALL() {
  return true;
}

export function filterConfigToFunction(
    config: any):
    (method: string, route: string, ip: string) => boolean {
  return createFilterRequestFunction(filterConfigToDecider(config));
}

function createFilterRequestFunction(
    allow: (geoInfo: Object, method: string, route: string) => boolean):
    (method: string, route: string, ip: string) => boolean {
  return (method: string, route: string, ip: string) => {
    if (method == 'OPTIONS') {
      return true;
    }
    const geoInfo = geoIpLookup(ip);
    if (geoInfo && !allow(geoInfo, method, route)) {
      return false;
    }
    return true;
  };
}

function filterConfigToDecider(
    config: any):
    (geoInfo: Object, method: string, route: string) => boolean {
  if (!config) {
    return ALLOW_ALL;
  }
  const C = ensureObject(config);
  const filters = ensurePropArray(config, 'filters');
  const endpointWhitelist =
      config['endpoint-whitelist']
          ? ensurePropArray(config, 'endpoint-whitelist')
          : [];
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
  const whitelistFunctions = <((method: string, route: string) => boolean)[]>[];
  for (const whitelist of endpointWhitelist) {
    const w = ensureObject(whitelist);
    const method = ensurePropString(w, 'method');
    const route = ensurePropString(w, 'route');
    whitelistFunctions.push(
        (m: string, r: string) => m == method && r == route);
  }
  return (
      geoInfo: Object,
      method: string,
      route: string) =>
      whitelistFunctions.some(fn => fn(method, route))
          || filterFunctions.every(fn => fn(geoInfo));
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
    if (userCountry != fCountry) {
      return true;
    }
    if (!fRegion) {
      return false;
    }
    let userRegion = geoInfo['region'];
    if (!userRegion) {
      return false;
    }
    userRegion = userRegion.toLowerCase();
    if (userRegion == fRegion) {
      return false;
    }
    return true;
  };
}
