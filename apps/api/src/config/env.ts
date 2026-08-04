import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().default(4000),
  API_URL: z.string().default("http://localhost:4000"),
  WEB_URL: z.string().default("http://localhost:3000"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  DATABASE_URL: z.string(),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_EXPIRES: z.string().default("15m"),
  JWT_REFRESH_EXPIRES: z.string().default("7d"),
  GOOGLE_CLIENT_ID: z.string().optional().default(""),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(""),
  GOOGLE_CALLBACK_URL: z
    .string()
    .default("http://localhost:4000/api/v1/auth/google/callback"),
  OPENAI_API_KEY: z.string().optional().default(""),
  OPENAI_MODEL: z.string().default("gpt-4o-mini"),
  S3_ENDPOINT: z.string().default("http://localhost:9000"),
  S3_ACCESS_KEY: z.string().default("minioadmin"),
  S3_SECRET_KEY: z.string().default("minioadmin"),
  S3_BUCKET: z.string().default("ai-assistant"),
  S3_REGION: z.string().default("us-east-1"),
  S3_FORCE_PATH_STYLE: z
    .string()
    .default("true")
    .transform((v) => v === "true"),
  MEILI_HOST: z.string().default("http://localhost:7700"),
  MEILI_MASTER_KEY: z.string().default("masterKey_change_me_in_prod"),
  WHATSAPP_VERIFY_TOKEN: z.string().default("whatsapp-verify-token"),
  WHATSAPP_API_VERSION: z.string().default("v21.0"),
  WHATSAPP_ACCESS_TOKEN: z.string().optional().default(""),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional().default(""),
  PUBLIC_QUOTE_BASE_URL: z.string().default("http://localhost:3000/q"),
});

export const env = envSchema.parse(process.env);
