import { RepositoryFactory } from "../src/repositories/provider-factory";
import crypto from "crypto";

async function indexDocuments() {
  console.log("Seeding RAG documents...");
  const ragRepo = RepositoryFactory.getRagRepository();

  const documents = [
    {
      title: "How to perform a balance test",
      source: "STEDI Mobility Guide",
      section: "Testing",
      content: "To perform the rapid step test, stand comfortably and when the timer starts, step back and forth as quickly as possible. The device will measure your duration and calculate a mobility score. Do not perform this test if you feel dizzy or unstable.",
    },
    {
      title: "Understanding Risk Scores",
      source: "STEDI FAQ",
      section: "Results",
      content: "The risk score indicates your generalized fall risk. A score under 50 suggests a low risk, while scores above 50 may indicate an increased risk. This is not a medical diagnosis. Please consult your physician for medical advice.",
    },
    {
      title: "Clinician Access and Consent",
      source: "STEDI Privacy Policy",
      section: "Privacy",
      content: "Your clinician can request access to your test results. You will receive a notification to approve or deny this request in your app. If approved, they can view your historical tests. You can revoke access at any time in the settings menu.",
    },
    {
      title: "STEDI Voice IVR",
      source: "STEDI Mobility Guide",
      section: "Accessibility",
      content: "If you cannot use the mobile app, you can use our automated phone system. Call the STEDI Voice number, enter your 10-digit phone number and Date of Birth (MMDDYYYY) to authenticate, and follow the voice prompts to log a test.",
    }
  ];

  for (const doc of documents) {
    const checksum = crypto.createHash('sha256').update(doc.content).digest('hex');
    
    // Check if it already exists (simplified)
    const existing = await (ragRepo as any).similaritySearch(null, 1); // Mock check
    
    const createdDoc = await ragRepo.createDocument({
      title: doc.title,
      source: doc.source,
      section: doc.section,
      metadata: {},
      checksum,
      updatedAt: new Date()
    });

    await ragRepo.addChunks([
      {
        documentId: createdDoc.id,
        content: doc.content,
        section: doc.section,
        metadata: {},
        embedding: null // Handled later or mocked
      }
    ]);
    
    console.log(`Indexed document: ${doc.title}`);
  }

  console.log("RAG ingestion complete!");
}

const isDryRun = process.argv.includes("--dry-run");

if (isDryRun) {
  console.log("[DRY RUN] Would index RAG documents.");
  process.exit(0);
}

indexDocuments().catch(console.error);
