/**
 * Global test setup — runs before all test suites.
 * Mocks environment variables so tests never touch real services.
 */

import { vi } from "vitest";

// Mock environment variables before any module loads the env config
process.env.NODE_ENV = "test";
process.env.PORT = "4000";
process.env.ALLOW_ORIGINS = "http://localhost:3000";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
process.env.REDIS_URL = "redis://localhost:6379";
process.env.CLERK_PUBLISHABLE_KEY = "pk_test_mock";
process.env.CLERK_SECRET_KEY = "sk_test_mock";
process.env.CLERK_WEBHOOK_SECRET = "whsec_test_mock";
process.env.AWS_ACCESS_KEY_ID = "test-key";
process.env.AWS_SECRET_ACCESS_KEY = "test-secret";
process.env.AWS_REGION = "us-east-1";
process.env.AWS_S3_BUCKET = "test-bucket";
process.env.GEMINI_API_KEY = "test-gemini-key";
process.env.PINECONE_API_KEY = "test-pinecone-key";
process.env.PINECONE_INDEX = "test-index";

// Mock the logger to prevent noisy output during tests
vi.mock("../utils/logger.js", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
  },
}));
