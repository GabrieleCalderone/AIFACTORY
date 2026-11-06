/**
 * S3-compatible object store (Cloudflare R2) with a dependency-free AWS Signature V4 signer.
 * Used as the persistent public media host when MEDIA_STORE=r2; GitHub Pages stays the default.
 *
 *   createR2Store({ endpoint: "https://<account>.r2.cloudflarestorage.com", bucket, accessKeyId, secretAccessKey, publicBaseUrl })
 *     .put("slug/version/reel.mp4", buffer, "video/mp4")  -> "https://media.example/slug/version/reel.mp4"
 */
import { createHash, createHmac } from "node:crypto";

export type SignInput = {
  method: string;
  url: URL;
  headers: Record<string, string>; // must include host; x-amz-date and x-amz-content-sha256 are added when missing
  payloadHash: string;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  service?: string;
  date?: Date;
};

const sha256Hex = (data: string | Buffer) =>
  createHash("sha256").update(data).digest("hex");
const hmac = (key: Buffer | string, data: string) =>
  createHmac("sha256", key).update(data).digest();
const amzDate = (d: Date) => d.toISOString().replace(/[:-]|\.\d{3}/g, "");
const encodePath = (p: string) =>
  p
    .split("/")
    .map((s) =>
      encodeURIComponent(s).replace(
        /[!'()*]/g,
        (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
      ),
    )
    .join("/");

/** Returns the headers to send (input headers plus x-amz-* and Authorization). Pure. */
export const signS3Request = (input: SignInput): Record<string, string> => {
  const service = input.service ?? "s3";
  const date = input.date ?? new Date();
  const headers: Record<string, string> = { ...input.headers };
  if (!headers["x-amz-date"]) headers["x-amz-date"] = amzDate(date);
  if (!headers["x-amz-content-sha256"])
    headers["x-amz-content-sha256"] = input.payloadHash;
  const lower = Object.fromEntries(
    Object.entries(headers).map(([k, v]) => [
      k.toLowerCase(),
      v.trim().replace(/\s+/g, " "),
    ]),
  );
  const signedHeaders = Object.keys(lower).sort().join(";");
  const canonicalHeaders = Object.keys(lower)
    .sort()
    .map((k) => `${k}:${lower[k]}\n`)
    .join("");
  const query = [...input.url.searchParams.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
  const canonicalRequest = [
    input.method.toUpperCase(),
    encodePath(input.url.pathname),
    query,
    canonicalHeaders,
    signedHeaders,
    input.payloadHash,
  ].join("\n");
  const dateStamp = lower["x-amz-date"].slice(0, 8);
  const scope = `${dateStamp}/${input.region}/${service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    lower["x-amz-date"],
    scope,
    sha256Hex(canonicalRequest),
  ].join("\n");
  const kDate = hmac(`AWS4${input.secretAccessKey}`, dateStamp);
  const kRegion = hmac(kDate, input.region);
  const kService = hmac(kRegion, service);
  const kSigning = hmac(kService, "aws4_request");
  const signature = createHmac("sha256", kSigning)
    .update(stringToSign)
    .digest("hex");
  headers.Authorization = `AWS4-HMAC-SHA256 Credential=${input.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  return headers;
};

export type FetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string>; body?: Buffer },
) => Promise<{ ok: boolean; status: number }>;

export const createR2Store = (opts: {
  endpoint: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicBaseUrl: string;
  region?: string;
  fetchImpl?: FetchLike;
}) => {
  const fetchImpl = opts.fetchImpl ?? (fetch as unknown as FetchLike);
  const region = opts.region ?? "auto";
  const base = new URL(opts.endpoint);
  const objectUrl = (key: string) =>
    new URL(
      `/${opts.bucket}/${key.split("/").map(encodeURIComponent).join("/")}`,
      base,
    );
  return {
    publicUrl(key: string): string {
      return `${opts.publicBaseUrl.replace(/\/$/, "")}/${key}`;
    },
    async put(key: string, body: Buffer, contentType: string): Promise<string> {
      const url = objectUrl(key);
      const headers = signS3Request({
        method: "PUT",
        url,
        headers: {
          host: url.host,
          "content-type": contentType,
          "content-length": String(body.length),
        },
        payloadHash: sha256Hex(body),
        accessKeyId: opts.accessKeyId,
        secretAccessKey: opts.secretAccessKey,
        region,
      });
      const res = await fetchImpl(url.href, { method: "PUT", headers, body });
      if (!res.ok) throw new Error(`R2 PUT ${key}: HTTP ${res.status}`);
      return this.publicUrl(key);
    },
    async exists(key: string): Promise<boolean> {
      const url = objectUrl(key);
      const headers = signS3Request({
        method: "HEAD",
        url,
        headers: { host: url.host },
        payloadHash: sha256Hex(""),
        accessKeyId: opts.accessKeyId,
        secretAccessKey: opts.secretAccessKey,
        region,
      });
      const res = await fetchImpl(url.href, { method: "HEAD", headers });
      return res.ok;
    },
  };
};
