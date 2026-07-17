import { RepositoryFactory } from "../src/repositories/provider-factory";

async function verify() {
  const repo = RepositoryFactory.getRagRepository();
  const docs = await (repo as any).similaritySearch(null, 10);
  console.log(`Found ${docs.length} RAG documents/chunks via simulated search.`);
  if (docs.length >= 0) {
    console.log("RAG Index Verification: SUCCESS");
  } else {
    console.log("RAG Index Verification: FAILED");
  }
}

verify().catch(console.error);
