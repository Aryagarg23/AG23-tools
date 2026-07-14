import fs from 'fs';
import path from 'path';
import { SimpleVectorDB } from '../src/vector-db.js';

const DOCS_DIR = './docs';
const DB_PATH = './docs/vector-db.json';

async function main() {
  console.log('--- Documentation Vector DB Builder ---');
  
  const db = new SimpleVectorDB(DB_PATH);
  
  // Clean start - initialize empty database
  db.documents = [];
  db.save();

  if (!fs.existsSync(DOCS_DIR)) {
    console.error(`Docs directory not found: ${DOCS_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(DOCS_DIR)
    .filter(file => file.endsWith('.md'))
    .sort();

  console.log(`Found docs: ${files.join(', ')}`);

  let totalChunks = 0;

  for (const file of files) {
    const filePath = path.join(DOCS_DIR, file);
    const content = fs.readFileSync(filePath, 'utf8');

    // Split content by headers or double newlines (paragraphs)
    // We filter out very short blocks (e.g. titles or empty lines)
    const blocks = content.split(/\n\s*\n/)
      .map(block => block.trim())
      .filter(block => block.length > 20);

    console.log(`Processing ${file}: split into ${blocks.length} chunks`);

    blocks.forEach((text, index) => {
      const chunkId = `${file}#chunk-${index}`;
      
      // Determine a heading or subtopic to assign as metadata
      const lines = text.split('\n');
      const titleLine = lines.find(l => l.startsWith('#')) || '';
      const sectionName = titleLine ? titleLine.replace(/^#+\s*/, '') : file;

      db.addDocument(chunkId, text, {
        source: file,
        chunkIndex: index,
        section: sectionName
      });
      totalChunks++;
    });
  }

  console.log(`Successfully built Vector Database! Saved ${totalChunks} chunks to ${DB_PATH}`);

  // Verification test search query
  console.log('\nRunning sanity search check for query: "Devin agent"...');
  const resultsDevin = db.search('Devin agent', 2);
  resultsDevin.forEach((r, idx) => {
    console.log(`Match #${idx+1} [Score: ${r.score.toFixed(4)}] (${r.id}):`);
    console.log(`   "${r.text.substring(0, 120)}..."`);
  });

  console.log('\nRunning sanity search check for query: "RCA failure feedback"...');
  const resultsRca = db.search('RCA failure feedback', 2);
  resultsRca.forEach((r, idx) => {
    console.log(`Match #${idx+1} [Score: ${r.score.toFixed(4)}] (${r.id}):`);
    console.log(`   "${r.text.substring(0, 120)}..."`);
  });
}

main().catch(err => {
  console.error('Builder failed:', err);
});
