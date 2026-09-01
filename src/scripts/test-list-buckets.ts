import { S3Client, ListBucketsCommand, ListObjectsCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";
dotenv.config();

const client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

async function test() {
  try {
    console.log("Listing buckets...");
    const res = await client.send(new ListBucketsCommand({}));
    console.log("Buckets:", res.Buckets);
  } catch (err: any) {
    console.error("ListBuckets Error:", err.name, err.message);
  }
}

test();
