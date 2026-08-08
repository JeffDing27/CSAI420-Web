export class RiskScoreService {
  private readonly baseUrl =
    process.env.STEDI_API_BASE_URL || "https://dev.stedi.me";

  async fetchRiskScore(email: string, sessionToken: string): Promise<Response> {
    const target = `${this.baseUrl}/riskscore/${encodeURIComponent(email)}`;
    return fetch(target, {
      method: "GET",
      headers: {
        accept: "application/json, text/plain;q=0.9, */*;q=0.8",
        "suresteps.session.token": sessionToken,
      },
      cache: "no-store",
    });
  }
}
