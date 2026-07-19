import { createWriteStream } from 'fs';
import { join } from 'path';
import archiver from 'archiver';

const browser = process.argv[2] || 'chrome';
const output = createWriteStream(join('dist', `qa-element-finder-${browser}.zip`));
const archive = archiver('zip', { zlib: { level: 9 } });

archive.pipe(output);
archive.directory('dist/', false);
archive.finalize();
