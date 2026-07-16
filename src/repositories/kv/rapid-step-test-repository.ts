import { kvGet, kvSet } from "@/utils/kv-store";
import type { RapidStepTest } from "@prisma/client";
import crypto from "crypto";
import type { RapidStepTestRepository } from "../interfaces";

export class KvRapidStepTestRepository implements RapidStepTestRepository {
  async findById(id: string): Promise<RapidStepTest | null> {
    const test = await kvGet<any>(`test:${id}`);
    if (!test) return null;

    return {
      ...test,
      createdAt: new Date(test.createdAt),
      completedAt: test.completedAt ? new Date(test.completedAt) : null,
    };
  }

  async findByUserId(userId: string): Promise<RapidStepTest[]> {
    const testIds = await kvGet<string[]>(`user_tests:${userId}`) || [];
    const tests: RapidStepTest[] = [];

    for (const id of testIds) {
      const test = await this.findById(id);
      if (test) {
        tests.push(test);
      }
    }

    return tests.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async create(
    test: Omit<RapidStepTest, "id" | "createdAt">,
  ): Promise<RapidStepTest> {
    const newTest: RapidStepTest = {
      ...test,
      id: (test as any).id || crypto.randomUUID(),
      createdAt: new Date(),
    };

    await kvSet(`test:${newTest.id}`, newTest);
    
    // Add to user's test list
    const userTestsKey = `user_tests:${newTest.userId}`;
    const testIds = await kvGet<string[]>(userTestsKey) || [];
    testIds.push(newTest.id);
    await kvSet(userTestsKey, testIds);

    return newTest;
  }
}
