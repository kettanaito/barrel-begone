import { globbySync } from 'globby';
import * as resolve from 'resolve.exports';
import { RESOLVE_EXPORTS_OPTIONS } from './utils.js';

/**
 * Gather all accessible files based on the "exports" object in package.json
 * @param {string | object} exports
 * @returns {string[]}
 */
export function gatherFilesFromPackageExports(exports, { cwd }) {
  /**
   * @example "exports": "./index.js"
   */
  if (typeof exports === 'string') {
    return [exports];
  }

  /**
   * If a key doesn't start with a ".", then it's a condition
   * @example "exports": { "default": "./index.js" }
   */
  const isExportCondition = Object.keys(exports).every(key => !key.startsWith('.'));
  if (isExportCondition) {
    return resolve.exports({exports});
  }

  const filePaths = [];
  for (const [key, value] of Object.entries(exports)) {
    /**
     * @example "exports": { "./foo/*": null }
     */
    if (value === null) {
      continue;
    }

    /**
     * @example "exports": { "./foo/*": "./foo/bar/*.js" }
     */
    else if (key.includes('*')) {
      const placeholders = resolve.exports({exports}, key.replaceAll('*', '<PLACEHOLDER>'), RESOLVE_EXPORTS_OPTIONS);
      for (const placeholder of placeholders) {
        const glob = placeholder.replaceAll('<PLACEHOLDER>', '*');
        const paths = globbySync(glob, { cwd });
        filePaths.push(...paths);
      }
    } else {
      try {
        const r = resolve.exports({exports}, key, {
          conditions: ["import", "default"],
          browser: true,
        });
        filePaths.push(...r);
      } catch {
        const r = resolve.exports({exports}, key);
        filePaths.push(...r);
      }
    }
  }

  return filePaths;
}