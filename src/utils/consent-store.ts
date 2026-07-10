interface ClinicianConsent {
  clinicianUsername: string;
  consentExpirationDate: string;
}

interface Store {
  consents: Map<string, boolean>;
  consentedClinicians: Map<string, Map<string, string>>;
}

const globalForStore = globalThis as unknown as {
  __consentStore: Store | undefined;
};

export const consentStore = globalForStore.__consentStore ?? {
  consents: new Map<string, boolean>(),
  consentedClinicians: new Map<string, Map<string, string>>(),
};

if (process.env.NODE_ENV !== "production") {
  globalForStore.__consentStore = consentStore;
}

export function setConsent(customer: string, value: boolean) {
  consentStore.consents.set(customer, value);
}

export function getConsent(customer: string): boolean {
  return consentStore.consents.get(customer) ?? false;
}

export function setConsentedClinician(customer: string, clinicianUsername: string) {
  let customerClinicians = consentStore.consentedClinicians.get(customer);
  if (!customerClinicians) {
    customerClinicians = new Map<string, string>();
    consentStore.consentedClinicians.set(customer, customerClinicians);
  }
  
  const expirationDate = new Date();
  expirationDate.setFullYear(expirationDate.getFullYear() + 1);
  
  const formattedDate = expirationDate.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
  
  customerClinicians.set(clinicianUsername, formattedDate);
}

export function getConsentedClinicians(customer: string): ClinicianConsent[] {
  const customerClinicians = consentStore.consentedClinicians.get(customer);
  if (!customerClinicians) return [];
  
  return Array.from(customerClinicians.entries()).map(([clinicianUsername, consentExpirationDate]) => ({
    clinicianUsername,
    consentExpirationDate
  }));
}
