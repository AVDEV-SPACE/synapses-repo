import { resolve } from 'path';
import { pathToFileURL } from 'url';
import tsNode from 'ts-node';

tsNode.register({
  transpileOnly: true,
  swc: true, // Folosește SWC pentru performanță
  esm: true,
});

export function resolve(specifier, context, defaultResolve) {
  // Utilizează `pathToFileURL` pentru a rezolva căi relative
  if (specifier.startsWith('src/')) {
    return defaultResolve(pathToFileURL(resolve(specifier)).href, context, defaultResolve);
  }

  return defaultResolve(specifier, context, defaultResolve);
}

export { load } from 'ts-node/esm';
