import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const HTTP_METHODS = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
] as const;

type HttpMethod = (typeof HTTP_METHODS)[number];

type OpenApiResponse = {
  description: string;
  content?: Record<string, { schema: Record<string, unknown>; examples?: Record<string, unknown> }>;
};

type OpenApiOperation = {
  summary: string;
  description?: string;
  tags?: string[];
  parameters?: Array<Record<string, unknown>>;
  requestBody?: Record<string, unknown>;
  responses: Record<string, OpenApiResponse>;
  security?: Array<Record<string, string[]>>;
};

type OpenApiSpec = {
  openapi: string;
  info: {
    title: string;
    version: string;
    description: string;
  };
  servers: Array<{ url: string }>;
  paths: Record<string, Partial<Record<Lowercase<HttpMethod>, OpenApiOperation>>>;
  components: {
    securitySchemes: Record<string, Record<string, unknown>>;
    schemas: Record<string, Record<string, unknown>>;
  };
};

function routeDirToOpenApiPath(relativeDir: string): string {
  if (!relativeDir) {
    return "/";
  }

  const segments = relativeDir
    .split(path.sep)
    .filter(Boolean)
    .map((segment) => {
      if (segment.startsWith("[") && segment.endsWith("]")) {
        return `{${segment.slice(1, -1)}}`;
      }
      return segment;
    });

  return `/${segments.join("/")}`;
}

function extractMethods(routeSource: string): HttpMethod[] {
  const methods: HttpMethod[] = [];

  for (const method of HTTP_METHODS) {
    const methodRegex = new RegExp(`export\\s+async\\s+function\\s+${method}\\s*\\(`);
    if (methodRegex.test(routeSource)) {
      methods.push(method);
    }
  }

  return methods;
}

async function collectRouteFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      const nestedFiles = await collectRouteFiles(fullPath);
      files.push(...nestedFiles);
      continue;
    }

    if (entry.isFile() && entry.name === "route.ts") {
      files.push(fullPath);
    }
  }

  return files;
}

function defaultOperation(pathname: string, method: HttpMethod): OpenApiOperation {
  const tag = pathname.split("/").filter(Boolean)[0] || "root";

  return {
    summary: `${method} ${pathname}`,
    description: "Auto-generated from route handler export.",
    tags: [tag],
    responses: {
      "200": {
        description: "Successful response",
        content: {
          "application/json": {
            schema: {
              type: "object",
              additionalProperties: true,
            },
          },
        },
      },
      "400": {
        description: "Bad request",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      "401": {
        description: "Unauthorized",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      "500": {
        description: "Internal server error",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
    },
  };
}

function createComponents(): OpenApiSpec["components"] {
  return {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Standard Authorization bearer token.",
      },
      sessionTokenHeader: {
        type: "apiKey",
        in: "header",
        name: "suresteps.session.token",
        description: "Session token used by STEDI-compatible endpoints.",
      },
      deviceIdHeader: {
        type: "apiKey",
        in: "header",
        name: "x-stedi-device-id",
      },
      deviceTokenHeader: {
        type: "apiKey",
        in: "header",
        name: "x-stedi-device-token",
      },
    },
    schemas: {
      ErrorResponse: {
        type: "object",
        properties: {
          error: { type: "string" },
          message: { type: "string" },
        },
        additionalProperties: true,
        example: {
          error: "Invalid request",
        },
      },
      LoginRequest: {
        type: "object",
        properties: {
          userName: { type: "string", example: "jane@example.com" },
          email: { type: "string", format: "email", example: "jane@example.com" },
          password: { type: "string", example: "mySecurePassword123" },
        },
        required: ["password"],
        anyOf: [{ required: ["userName"] }, { required: ["email"] }],
      },
      UserCreateRequest: {
        type: "object",
        properties: {
          userName: { type: "string", example: "janedoe" },
          email: { type: "string", format: "email", example: "jane@example.com" },
          password: { type: "string", minLength: 8, example: "mySecurePassword123" },
          verifyPassword: { type: "string", minLength: 8, example: "mySecurePassword123" },
          birthDate: { type: "string", example: "1990-01-01" },
          phone: { type: "string", example: "+15555550123" },
          region: { type: "string", example: "US" },
        },
        required: ["userName", "email", "password", "verifyPassword", "birthDate"],
      },
      CustomerRequest: {
        type: "object",
        description: "Customer payload forwarded to STEDI /customer.",
        properties: {
          email: { type: "string", format: "email", example: "jane@example.com" },
          firstName: { type: "string", example: "Jane" },
          lastName: { type: "string", example: "Doe" },
          phone: { type: "string", example: "+15555550123" },
          birthDate: { type: "string", example: "1990-01-01" },
        },
        additionalProperties: true,
      },
      RapidStepTestRequest: {
        type: "object",
        description: "Rapid step test payload. Schema is intentionally flexible because upstream accepts varied sensor fields.",
        properties: {
          email: { type: "string", format: "email", example: "jane@example.com" },
          testId: { type: "string", example: "test-123" },
          startTime: { type: "string", format: "date-time" },
          endTime: { type: "string", format: "date-time" },
          steps: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: true,
            },
          },
        },
        additionalProperties: true,
        example: {
          email: "jane@example.com",
          testId: "rst-001",
          startTime: "2026-08-04T19:15:00Z",
          endTime: "2026-08-04T19:15:40Z",
          steps: [{ t: 0, x: 0.03, y: 0.11, z: 0.94 }],
        },
      },
      RiskScoreResponse: {
        type: "object",
        properties: {
          score: { type: "number", example: 72.4 },
        },
        required: ["score"],
      },
    },
  };
}

function applyDetailedOverrides(
  paths: OpenApiSpec["paths"],
): OpenApiSpec["paths"] {
  const setOp = (
    pathname: string,
    method: Lowercase<HttpMethod>,
    operation: OpenApiOperation,
  ) => {
    if (!paths[pathname]) {
      paths[pathname] = {};
    }
    paths[pathname][method] = operation;
  };

  setOp("/login", "post", {
    summary: "Authenticate user",
    description:
      "Authenticates with local store or forwards to STEDI /login. Returns a plain-text token on success.",
    tags: ["auth"],
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: { $ref: "#/components/schemas/LoginRequest" },
          examples: {
            basic: {
              value: {
                userName: "jane@example.com",
                password: "mySecurePassword123",
              },
            },
          },
        },
      },
    },
    responses: {
      "200": {
        description: "Login succeeded; body is a text token.",
        content: {
          "text/plain": {
            schema: { type: "string", example: "suresteps.session.token.value" },
          },
        },
      },
      "400": {
        description: "Invalid JSON or missing credentials.",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      "401": {
        description: "Invalid credentials.",
        content: {
          "text/plain": {
            schema: { type: "string", example: "Invalid username or password" },
          },
        },
      },
    },
  });

  setOp("/user", "post", {
    summary: "Create user",
    description:
      "Creates a user in local mode or forwards to STEDI /user.",
    tags: ["auth"],
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: { $ref: "#/components/schemas/UserCreateRequest" },
        },
      },
    },
    responses: {
      "200": {
        description: "User created.",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                message: { type: "string", example: "User created successfully" },
                email: { type: "string", format: "email", example: "jane@example.com" },
              },
              additionalProperties: true,
            },
          },
        },
      },
      "400": {
        description: "Validation failed.",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      "409": {
        description: "User already exists.",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
      "502": {
        description: "Upstream STEDI service failure.",
        content: {
          "text/plain": {
            schema: { type: "string", example: "Upstream service unavailable" },
          },
        },
      },
    },
  });

  setOp("/customer", "post", {
    summary: "Create customer",
    description: "Forwards customer payload to STEDI /customer.",
    tags: ["customer"],
    security: [{ sessionTokenHeader: [] }, { bearerAuth: [] }],
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: { $ref: "#/components/schemas/CustomerRequest" },
        },
      },
    },
    responses: {
      "200": {
        description: "Customer accepted by upstream.",
        content: {
          "application/json": {
            schema: {
              type: "object",
              additionalProperties: true,
            },
          },
        },
      },
      "401": {
        description: "Missing or invalid token.",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
          },
        },
      },
    },
  });

  setOp("/rapidsteptest", "post", {
    summary: "Submit rapid step test",
    description:
      "Supports legacy user flow (session token) and device-authenticated flow.",
    tags: ["tests"],
    security: [
      { sessionTokenHeader: [] },
      { bearerAuth: [] },
      { deviceIdHeader: [], deviceTokenHeader: [] },
    ],
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: { $ref: "#/components/schemas/RapidStepTestRequest" },
        },
      },
    },
    responses: {
      "200": {
        description: "Test saved.",
        content: {
          "text/plain": {
            schema: { type: "string", example: "Saved" },
          },
          "application/json": {
            schema: {
              type: "object",
              additionalProperties: true,
            },
          },
        },
      },
      "400": {
        description: "Invalid JSON or payload mismatch.",
        content: {
          "text/plain": {
            schema: { type: "string", example: "Invalid JSON" },
          },
        },
      },
      "401": {
        description: "Unauthorized.",
        content: {
          "text/plain": {
            schema: { type: "string", example: "Incomplete device credentials" },
          },
        },
      },
      "409": {
        description: "No active assignment for device.",
        content: {
          "text/plain": {
            schema: {
              type: "string",
              example: "Device has no active patient assignment",
            },
          },
        },
      },
    },
  });

  setOp("/riskscore/{email}", "get", {
    summary: "Get risk score by email",
    description:
      "Bridges to the upstream STEDI GET /riskscore/{email} endpoint and returns the upstream response body unchanged.",
    tags: ["risk"],
    security: [{ sessionTokenHeader: [] }],
    parameters: [
      {
        name: "email",
        in: "path",
        required: true,
        schema: { type: "string", format: "email" },
        example: "jane@example.com",
      },
      {
        name: "suresteps-session-token",
        in: "header",
        required: true,
        schema: { type: "string" },
        example: "bd41655f-96cb-42c0-9c71-e0620d42a17f",
        description:
          "Session token forwarded upstream as suresteps.session.token when calling STEDI.",
      },
    ],
    responses: {
      "200": {
        description: "Raw upstream STEDI risk score response.",
        content: {
          "application/json": {
            schema: {
              oneOf: [{ type: "number", example: 1.5 }, { type: "object", additionalProperties: true }],
            },
          },
          "text/plain": {
            schema: { type: "string", example: "1.5" },
          },
        },
      },
      "401": {
        description: "Missing suresteps-session-token header.",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
            examples: {
              missingHeader: {
                value: { error: "Missing suresteps-session-token header" },
              },
            },
          },
        },
      },
      "500": {
        description: "Failed to fetch risk score from upstream STEDI service.",
        content: {
          "text/plain": {
            schema: { type: "string", example: "Internal Server Error" },
          },
        },
      },
    },
  });

  return paths;
}

export async function buildOpenApiSpec(): Promise<OpenApiSpec> {
  const appDir = path.join(process.cwd(), "src", "app");
  const routeFiles = await collectRouteFiles(appDir);
  const paths: OpenApiSpec["paths"] = {};

  for (const filePath of routeFiles) {
    const relativeToApp = path.relative(appDir, path.dirname(filePath));
    const pathname = routeDirToOpenApiPath(relativeToApp);
    const source = await readFile(filePath, "utf8");
    const methods = extractMethods(source);

    if (!methods.length) {
      continue;
    }

    if (!paths[pathname]) {
      paths[pathname] = {};
    }

    for (const method of methods) {
      paths[pathname][method.toLowerCase() as Lowercase<HttpMethod>] =
        defaultOperation(pathname, method);
    }
  }

  const detailedPaths = applyDetailedOverrides(paths);

  return {
    openapi: "3.0.3",
    info: {
      title: "CSAI420 API",
      version: "1.0.0",
      description:
        "Auto-generated endpoint index from src/app route handlers with detailed schemas for core pass-through endpoints.",
    },
    servers: [{ url: process.env.API_URL || "http://localhost:3000" }],
    paths: detailedPaths,
    components: createComponents(),
  };
}
