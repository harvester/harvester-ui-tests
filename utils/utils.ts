
import AdmZip from 'adm-zip';
import { Node } from '@/models/host'
/**
 * This will validate the zip file by checking the contents. Assumes that this is in 
 * the downloads folder
 * @param filename a string of the filename for zip validation
 */
export const validateZip = (filename: string) => {
    const path = require('path');
    const downloadsFolder = Cypress.config('downloadsFolder')
    const downloadedFilename = path.join(downloadsFolder, filename)
    var zip = new AdmZip(downloadedFilename);
    var zipEntries = zip.getEntries(); // an array of ZipEntry records
    zipEntries = zip.getEntries(); // an array of ZipEntry records

    zipEntries.forEach(function (zipEntry) {
        console.log(zipEntry.toString()); // outputs zip entries information
        // if (zipEntry.entryName == "my_file.txt") {
        //     console.log(zipEntry.getData().toString("utf8"));
        // }
    });
}

export const deleteDownloadsFolder = () => {
    const downloadsFolder = Cypress.config('downloadsFolder')
  
    cy.task('deleteFolder', downloadsFolder)
}

export const generateName = (prefix: string) => {
    return `${prefix}-${Date.now()}`
}

export function base64DecodeToBuffer(string: string) {
  if (string === null || typeof string === 'undefined') {
    return string;
  }

  if ( typeof Buffer.from === 'function' && Buffer.from !== Uint8Array.from ) {
    return Buffer.from(string, 'base64');
  } else {
    return new Buffer(string, 'base64');
  }
}

export function base64Decode(string: string) {
  return !string ? string : base64DecodeToBuffer(string.replace(/[-_]/g, char => char === '-' ? '+' : '/')).toString();
}

export const host = {
  list(): Node[] {
    const hosts = Cypress.env('host');
  
    if (!hosts || hosts.length < 1) {
      throw new Error("No hosts defined in cypress env");
    }
  
    return hosts;
  },
  filterWitnessNode: (hosts: {name: string, witnessNode: boolean}[]) => {
    const ret = hosts.filter((host) => !host.witnessNode);

    if (!ret.length) {
      throw new Error("No eligible hosts found for testing");
    }

    return ret;
  }
}

/**
 * Whether a Harvester version (e.g. `v1.10.0-rc1`) is at least `min` (e.g. `v1.10.0`).
 * A pre-release counts as its release, a version that can't be parsed (e.g. `master-head`) counts as the latest.
 */
export const isVersionAtLeast = (version: string, min: string) => {
  const parse = (v: string) => (v || '').replace(/^v/, '').split('-')[0].split('.').map((n) => parseInt(n, 10));
  const current = parse(version);
  const minimum = parse(min);

  if (current.some((n) => isNaN(n))) {
    return true;
  }

  for (let i = 0; i < Math.max(current.length, minimum.length); i++) {
    const c = current[i] || 0;
    const m = minimum[i] || 0;

    if (c !== m) {
      return c > m;
    }
  }

  return true;
}

/**
 * Yields the `server-version` setting of the Harvester cluster, e.g. `v1.10.0`
 */
export const getServerVersion = (): Cypress.Chainable<string> => {
  return cy.request({
    url: '/v1/harvester/harvesterhci.io.settings/server-version',
    headers: { accept: 'application/json' },
  }).then((res) => res.body?.value as string);
}
