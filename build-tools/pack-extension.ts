/* This file is used to pack the dist/ directory into a zip file
 * for easy distribution and upload to browser extension stores.
 *
 * It also injects the version from package.json into manifest.json
 * so that the version is only defined in one place.
 */

import { stat, readFile, writeFile } from 'fs/promises';
import { createWriteStream } from 'fs';
import archiver from 'archiver';
import path from 'path';

const distDir = './dist';
const manifestPath = path.join(distDir, 'manifest.json');

/**
 * Pack the dist directory into a zip file using archiver.
 */
async function packExtension() {
  console.log('Packing extension...');

  try {
    // 1. Read name and version from package.json
    const packageJsonContent = await readFile('./package.json', 'utf-8');
    const { name, version } = JSON.parse(packageJsonContent);

    // 2. Check if dist directory exists
    const distStat = await stat(distDir);
    if (!distStat.isDirectory()) {
      throw new Error(`${distDir} is not a directory`);
    }

    // 3. Read manifest.json and inject version
    const manifestContent = await readFile(manifestPath, 'utf-8');
    const manifest = JSON.parse(manifestContent);

    if (manifest.version && manifest.version !== version) {
      console.warn(
        `Warning: manifest.json has version "${manifest.version}" but package.json has "${version}"`
      );
    }

    // Inject version from package.json
    manifest.version = version;

    // Write updated manifest back to dist
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`✓ Injected version ${version} into manifest.json`);

    // 4. Define the output filename dynamically
    const outputZipName = `${name}-v${version}.zip`;
    const outputZipPath = path.join('./', outputZipName);

    // Create a file to stream archive data to
    const output = createWriteStream(outputZipPath);
    const archive = archiver('zip', {
      zlib: { level: 9 }, // Maximum compression
    });

    // Listen for all archive data to be written
    const finishPromise = new Promise<void>((resolve, reject) => {
      output.on('close', () => {
        resolve();
      });

      archive.on('error', (err) => {
        reject(err);
      });

      output.on('error', (err) => {
        reject(err);
      });
    });

    // Pipe archive data to the file
    archive.pipe(output);

    // Append files from the dist directory
    archive.directory(distDir, false);

    // Finalize the archive
    await archive.finalize();

    // Wait for the stream to finish
    await finishPromise;

    const zipStat = await stat(outputZipPath);
    console.log(`✓ Extension packed successfully: ${outputZipName}`);
    console.log(`  Size: ${(zipStat.size / 1024).toFixed(2)} KB`);
    console.log(`  Total bytes: ${archive.pointer()}`);
  } catch (error) {
    console.error('Error packing extension:', error);
    process.exit(1);
  }
}

await packExtension();
