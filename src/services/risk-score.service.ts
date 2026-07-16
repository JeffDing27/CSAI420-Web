import { RepositoryFactory } from "@/repositories/provider-factory";

export class RiskScoreService {
  private userRepo = RepositoryFactory.getUserRepository();
  private testRepo = RepositoryFactory.getRapidStepTestRepository();

  async calculateRiskScore(customerIdentifier: string): Promise<number> {
    // Attempt to find user
    let user = await this.userRepo.findByEmail(customerIdentifier);
    if (!user) {
      user = await this.userRepo.findByPhone(customerIdentifier);
    }
    if (!user) {
      user = await this.userRepo.findByUsername(customerIdentifier);
    }

    if (user) {
      const tests = await this.testRepo.findByUserId(user.id);
      if (tests.length > 0) {
        // Return 1.5 as default for now, can be extended to use actual test data
        return 1.5;
      }
    }

    return 1.5;
  }
}
