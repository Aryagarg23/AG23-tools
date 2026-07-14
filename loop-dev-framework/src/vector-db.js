import fs from 'fs';
import path from 'path';

/**
 * A quick-and-dirty, zero-dependency local Vector Database implementation
 * using TF-IDF vectorization and Cosine Similarity.
 * Popular in lightweight scripting environments for fast context retrieval.
 */
export class SimpleVectorDB {
  /**
   * @param {string} dbFilePath Path to the JSON file where index is stored
   */
  constructor(dbFilePath) {
    this.dbFilePath = dbFilePath;
    this.documents = []; // Array of { id, text, metadata }
  }

  /**
   * Load the index from the JSON file
   */
  load() {
    if (fs.existsSync(this.dbFilePath)) {
      try {
        const data = fs.readFileSync(this.dbFilePath, 'utf8');
        this.documents = JSON.parse(data);
      } catch (err) {
        console.error('Error loading vector database file, initializing empty:', err.message);
        this.documents = [];
      }
    } else {
      this.documents = [];
    }
  }

  /**
   * Save the index to the JSON file
   */
  save() {
    const dir = path.dirname(this.dbFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.dbFilePath, JSON.stringify(this.documents, null, 2), 'utf8');
  }

  /**
   * Add a document chunk to the index
   * @param {string} id Unique identifier (e.g. filename#chunkIndex)
   * @param {string} text Chunk content
   * @param {object} metadata Additional metadata (source file, tags, etc.)
   */
  addDocument(id, text, metadata = {}) {
    this.load();
    // Overwrite existing doc with same id
    this.documents = this.documents.filter(doc => doc.id !== id);
    this.documents.push({ id, text, metadata });
    this.save();
  }

  /**
   * Tokenize text into lowercase words
   * @param {string} text
   * @returns {string[]}
   */
  tokenize(text) {
    if (!text) return [];
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // remove punctuation
      .split(/\s+/)
      .filter(w => w.length > 1); // skip single-character terms or empty strings
  }

  /**
   * Query the index using TF-IDF and Cosine Similarity
   * @param {string} query Search query
   * @param {number} limit Maximum results to return
   * @returns {Array<{ id: string, text: string, metadata: object, score: number }>}
   */
  search(query, limit = 3) {
    this.load();
    if (this.documents.length === 0) return [];

    const queryTokens = this.tokenize(query);
    if (queryTokens.length === 0) {
      return this.documents.slice(0, limit).map(d => ({ ...d, score: 0 }));
    }

    // Build the collection corpus of token arrays
    // Last element in corpus is the query itself
    const corpus = this.documents.map(d => this.tokenize(d.text));
    corpus.push(queryTokens);

    // Compute unique words across the entire corpus for dimensions
    const allWordsSet = new Set();
    for (const docTokens of corpus) {
      for (const token of docTokens) {
        allWordsSet.add(token);
      }
    }
    const allWords = Array.from(allWordsSet);
    const N = corpus.length; // Number of docs + query

    // Precompute Document Frequency (DF) for each word
    // How many docs (including query) contain the word
    const dfMap = {};
    for (const word of allWords) {
      let count = 0;
      for (const docTokens of corpus) {
        if (docTokens.includes(word)) {
          count++;
        }
      }
      dfMap[word] = count;
    }

    // Calculate TF-IDF vectors
    const vectors = corpus.map(docTokens => {
      const docLength = docTokens.length || 1;
      return allWords.map(word => {
        // Term Frequency (TF)
        const termCount = docTokens.filter(w => w === word).length;
        const tf = termCount / docLength;
        // Inverse Document Frequency (IDF)
        const df = dfMap[word] || 0;
        const idf = Math.log(N / (1 + df)) + 1; // standard smoothed IDF
        return tf * idf;
      });
    });

    // The query vector is the last one
    const queryVector = vectors[vectors.length - 1];
    const docVectors = vectors.slice(0, -1);

    // Helper for Cosine Similarity
    const cosineSimilarity = (vecA, vecB) => {
      let dotProduct = 0;
      let normASq = 0;
      let normBSq = 0;
      for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normASq += vecA[i] * vecA[i];
        normBSq += vecB[i] * vecB[i];
      }
      const normA = Math.sqrt(normASq);
      const normB = Math.sqrt(normBSq);
      if (normA === 0 || normB === 0) return 0;
      return dotProduct / (normA * normB);
    };

    // Score all documents
    const scored = this.documents.map((doc, idx) => {
      const score = cosineSimilarity(docVectors[idx], queryVector);
      return { ...doc, score };
    });

    // Sort descending and return top matches with positive score
    return scored
      .filter(d => d.score > 0.01)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
}
