export function sanitizeString(val: string): string {
  if (typeof val !== "string") return val;
  return val
    .replace(/<\/?script[^>]*>/gi, "")
    .replace(/DROP\s+TABLE/gi, "")
    .replace(/<!DOCTYPE[^>]*>/gi, "")
    .replace(/<!ENTITY[^>]*>/gi, "");
}

export function sanitizeRecursive(obj: any): any {
  if (typeof obj === "string") {
    return sanitizeString(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeRecursive(item));
  }
  if (obj !== null && typeof obj === "object") {
    const sanitizedObj: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        sanitizedObj[key] = sanitizeRecursive(obj[key]);
      }
    }
    return sanitizedObj;
  }
  return obj;
}
