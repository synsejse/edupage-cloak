/* This file is used to pack the dist/ directory into a zip file
 * for easy distribution and upload to browser extension stores.
 */

import { stat } from 'fs/promises';
import { createWriteStream } from 'fs';
import archiver from 'archiver';

const distDir = './dist';
const outputZip = './extension.zip';

/**
 * Pack the dist directory into a zip file using archiver.
 */
async function packExtension() {
  console.log('Packing extension...');

  try {
    // Check if dist directory exists
    const distStat = await stat(distDir);
    if (!distStat.isDirectory()) {
      throw new Error(`${distDir} is not a directory`);
    }

    // Create a file to stream archive data to
    const output = createWriteStream(outputZip);
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

    const zipStat = await stat(outputZip);
    console.log(`✓ Extension packed successfully: ${outputZip}`);
    console.log(`  Size: ${(zipStat.size / 1024).toFixed(2)} KB`);
    console.log(`  Total bytes: ${archive.pointer()}`);
  } catch (error) {
    console.error('Error packing extension:', error);
    process.exit(1);
  }
}

await packExtension();
