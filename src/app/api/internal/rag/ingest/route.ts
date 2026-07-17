import { NextResponse } from "next/server";
import { RepositoryFactory } from "@/repositories/provider-factory";

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { title, source, chunks, section, metadata } = data;

    if (!title || !source || !chunks || !Array.isArray(chunks)) {
      return NextResponse.json({ error: "Missing required fields: title, source, chunks" }, { status: 400 });
    }

    const ragRepo = RepositoryFactory.getRagRepository();

    // In a real app we might generate embeddings here with OpenAI if enabled,
    // but the repository can handle that or we just store them if not enabled.

    const document = await ragRepo.createDocument({
      title,
      source,
      section: section || null,
      metadata: metadata || {},
      updatedAt: new Date(),
    });

    await ragRepo.addChunks(
      chunks.map((c: any) => ({
        documentId: document.id,
        content: c.content,
        section: c.section || null,
        metadata: c.metadata || {},
        embedding: null, // Simulated
      }))
    );

    return NextResponse.json({ success: true, documentId: document.id, chunkCount: chunks.length });
  } catch (error: any) {
    console.error("RAG ingest error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
