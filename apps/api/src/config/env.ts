import { z } from "zod";
import * as dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(4000),
  ALLOW_ORIGINS: z.string().default("http://localhost:3000"),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().default("redis://localhost:6379"),

  //Clerk
  CLERK_PUBLISHABLE_KEY: z.string().min(1),
  CLERK_SECRET_KEY: z.string().min(1),
  CLERK_WEBHOOK_SECRET: z.string().min(1),

  //AWS
  AWS_ACCESS_KEY_ID: z.string().min(1),
  AWS_SECRET_ACCESS_KEY: z.string().min(1),
  AWS_REGION: z.string().default("us-east-1"),
  AWS_S3_BUCKET: z.string().min(1),
  // Optional: Endpoint is needed if you use Cloudflare R2 or MinIO instead of AWS
  AWS_S3_ENDPOINT: z.string().url().optional(),

  //Gemini && Pinecone
  GEMINI_API_KEY: z.string().min(1),
  PINECONE_API_KEY: z.string().min(1),
  PINECONE_INDEX: z.string().default("docusense"),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error("Invalid environment variables", _env.error.format());
  process.exit(1);
}

export const env = _env.data;
