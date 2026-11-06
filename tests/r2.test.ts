import { test } from "node:test";
import assert from "node:assert/strict";
import { createR2Store, signS3Request } from "../src/adapters/r2.ts";

// AWS documented example (Signature Version 4, "GET Object" with a Range header):
// https://docs.aws.amazon.com/AmazonS3/latest/API/sig-v4-header-based-auth.html
test("the signer reproduces the AWS documented GET Object signature", () => {
  const headers = signS3Request({
    method: "GET",
    url: new URL("https://examplebucket.s3.amazonaws.com/test.txt"),
    headers: {
      host: "examplebucket.s3.amazonaws.com",
      range: "bytes=0-9",
      "x-amz-date": "20130524T000000Z",
    },
    payloadHash:
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    accessKeyId: "AKIAIOSFODNN7EXAMPLE",
    secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    region: "us-east-1",
  });
  assert.equal(
    headers.Authorization,
    "AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE/20130524/us-east-1/s3/aws4_request, SignedHeaders=host;range;x-amz-content-sha256;x-amz-date, Signature=f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41",
  );
});

test("put signs a PUT with content hash and returns the public URL; failures surface the status", async () => {
  const calls: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: Buffer;
  }[] = [];
  const store = createR2Store({
    endpoint: "https://acc.r2.cloudflarestorage.com",
    bucket: "risthome-media",
    accessKeyId: "id",
    secretAccessKey: "secret",
    publicBaseUrl: "https://media.risthome.it/",
    fetchImpl: async (url, init) => {
      calls.push({ url, ...init });
      return {
        ok: !url.includes("fail"),
        status: url.includes("fail") ? 403 : 200,
      };
    },
  });
  const publicUrl = await store.put(
    "slug/v1/reel.mp4",
    Buffer.from("video"),
    "video/mp4",
  );
  assert.equal(publicUrl, "https://media.risthome.it/slug/v1/reel.mp4");
  assert.equal(
    calls[0].url,
    "https://acc.r2.cloudflarestorage.com/risthome-media/slug/v1/reel.mp4",
  );
  assert.equal(calls[0].method, "PUT");
  assert.match(
    calls[0].headers.Authorization,
    /^AWS4-HMAC-SHA256 Credential=id\/\d{8}\/auto\/s3\/aws4_request, SignedHeaders=content-length;content-type;host;x-amz-content-sha256;x-amz-date, Signature=[0-9a-f]{64}$/,
  );
  assert.equal(calls[0].headers["x-amz-content-sha256"].length, 64);
  await assert.rejects(
    () => store.put("fail/x.jpg", Buffer.from(""), "image/jpeg"),
    /HTTP 403/,
  );
});
