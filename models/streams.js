import fs from 'fs';

const readableStream = fs.createReadStream('sample.json', 'utf8');

const writableStream = fs.createWriteStream('output.json');

// add console,log after prip is done
    
readableStream.pipe(writableStream);

console.log("Copying started...");

