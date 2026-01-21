/* This file is used to compile content.ts and
 * background.ts scripts from the src/srcipts folder into the
 * extension's dist folder as JavaScript to be used in the
 * extension.
 */

import { getFilepaths } from './get-filepaths';
import { plugin } from 'bun';

// Plugin to handle ?raw imports (like Vite)
const rawPlugin = {
  name: 'raw-loader',
  setup(build) {
    build.onLoad({ filter: /\?raw$/ }, async (args) => {
      const filePath = args.path.replace(/\?raw$/, '');
      const contents = await Bun.file(filePath).text();
      return {
        contents: `export default ${JSON.stringify(contents)};`,
        loader: 'js',
      };
    });
    build.onResolve({ filter: /\?raw$/ }, (args) => {
      const resolved = import.meta.resolveSync(args.path.replace(/\?raw$/, ''), args.importer);
      return { path: resolved + '?raw', namespace: 'file' };
    });
  },
};

const entrypoints = await getFilepaths();

await Bun.build({
  entrypoints: entrypoints,
  outdir: './dist',
  minify: {
    identifiers: false,
    keepNames: false,
    whitespace: false,
    syntax: false,
  },
  plugins: [rawPlugin],
});
