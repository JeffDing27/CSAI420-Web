import { prisma } from "@/lib/prisma";
import type { RagDocument, RagChunk } from "@prisma/client";
import { normalizeJson } from "@/utils/json-normalize";

export class RagRepository {
  async findDocumentById(id: string): Promise<RagDocument | null> {
    return prisma.ragDocument.findUnique({
      where: { id },
    });
  }

  async createDocument(doc: Omit<RagDocument, "id">): Promise<RagDocument> {
    return prisma.ragDocument.create({
      data: {
        ...doc,
        metadata: normalizeJson(doc.metadata),
      },
    });
  }

  async addChunks(chunks: Omit<RagChunk, "id" | "createdAt">[]): Promise<void> {
    await prisma.ragChunk.createMany({
      data: chunks.map(chunk => ({
        ...chunk,
        metadata: normalizeJson(chunk.metadata),
        embedding: normalizeJson(chunk.embedding),
      })),
    });
  }

  async similaritySearch(queryEmbedding: any, limit = 5): Promise<RagChunk[]> {
    // If pgvector is enabled, this would use a raw query with the <-> operator:
    // return prisma.$queryRaw`SELECT * FROM "RagChunk" ORDER BY embedding <-> ${queryEmbedding}::vector LIMIT ${limit}`
    
    // For now, since embedding is Json and we might not have pgvector in tests,
    // we return a mock or a basic string match if we were doing text search.
    // We'll return empty here and rely on the mock logic in the agent for now
    // until the DB is fully pgvector-enabled.
    return [];
  }
}
