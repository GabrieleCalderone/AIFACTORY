/**
 * Buffer GraphQL API client (https://developers.buffer.com). Personal API key, Bearer auth.
 * Media must already be hosted on public URLs (Buffer has no upload endpoint).
 * Field names follow the public guides; any GraphQL error is surfaced verbatim so a
 * schema mismatch is visible on the first real call instead of being swallowed.
 */
export type FetchLike = (url: string, init: { method: string; headers: Record<string, string>; body: string }) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

export type BufferAsset = { image: { url: string } } | { video: { url: string; metadata?: { thumbnailOffset?: number } } };
export type BufferChannel = { id: string; name: string; service: string; displayName?: string; isDisconnected?: boolean };
export type BufferMetric = { type: string; name: string; value: number; unit?: string };

export type CreatePostArgs = {
  channelId: string;
  text: string;
  assets?: BufferAsset[];
  mode?: "addToQueue" | "customScheduled" | "shareNow";
  dueAt?: string;
  /** Channel-specific metadata, e.g. { instagram: { type: "reel" } } (verify against PostInputMetaData on first use). */
  metadata?: Record<string, unknown>;
};

export const createBufferClient = (opts: { apiKey: string; fetchImpl?: FetchLike; endpoint?: string }) => {
  const endpoint = opts.endpoint ?? "https://api.buffer.com";
  const fetchImpl = opts.fetchImpl ?? (fetch as unknown as FetchLike);
  if (!opts.apiKey) throw new Error("BUFFER_API_KEY is empty");

  const graphql = async <T>(query: string, variables: Record<string, unknown> = {}): Promise<T> => {
    const res = await fetchImpl(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${opts.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables }),
    });
    if (!res.ok) throw new Error(`Buffer API HTTP ${res.status}`);
    const body = (await res.json()) as { data?: T; errors?: { message: string }[] };
    if (body.errors?.length) throw new Error(`Buffer GraphQL: ${body.errors.map((e) => e.message).join("; ")}`);
    if (!body.data) throw new Error("Buffer GraphQL: empty data");
    return body.data;
  };

  return {
    graphql,
    async organizations(): Promise<{ id: string; name?: string }[]> {
      const d = await graphql<{ organizations: { id: string; name?: string }[] }>(`query { organizations { id name } }`);
      return d.organizations;
    },
    async channels(organizationId: string): Promise<BufferChannel[]> {
      const d = await graphql<{ channels: BufferChannel[] }>(
        `query Channels($input: ChannelsInput!) { channels(input: $input) { id name service displayName isDisconnected } }`,
        { input: { organizationId } },
      );
      return d.channels;
    },
    async createPost(args: CreatePostArgs): Promise<{ id: string; dueAt?: string }> {
      const input: Record<string, unknown> = {
        channelId: args.channelId,
        text: args.text,
        schedulingType: "automatic",
        mode: args.mode ?? "addToQueue",
      };
      if (args.dueAt) input.dueAt = args.dueAt;
      if (args.assets?.length) input.assets = args.assets;
      if (args.metadata) input.metadata = args.metadata;
      const d = await graphql<{ createPost: { __typename: string; post?: { id: string; dueAt?: string }; message?: string } }>(
        `mutation CreatePost($input: CreatePostInput!) { createPost(input: $input) { __typename ... on PostActionSuccess { post { id dueAt } } ... on MutationError { message } } }`,
        { input },
      );
      if (!d.createPost.post) throw new Error(`Buffer createPost failed: ${d.createPost.message ?? d.createPost.__typename}`);
      return d.createPost.post;
    },
    async postMetrics(postId: string): Promise<{ metrics: BufferMetric[]; metricsUpdatedAt?: string; status?: string; externalLink?: string }> {
      const d = await graphql<{ post: { id: string; status?: string; externalLink?: string; metricsUpdatedAt?: string; metrics?: BufferMetric[] } }>(
        `query Post($input: PostInput!) { post(input: $input) { id status externalLink metricsUpdatedAt metrics { type name value unit } } }`,
        { input: { id: postId } },
      );
      return { metrics: d.post.metrics ?? [], metricsUpdatedAt: d.post.metricsUpdatedAt, status: d.post.status, externalLink: d.post.externalLink };
    },
  };
};

/** Map Buffer metric names onto data/experiments.csv columns (unknown names are ignored). */
export const metricsToColumns = (metrics: BufferMetric[]): Record<string, number> => {
  const map: Record<string, string> = {
    reach: "reach",
    impressions: "plays",
    views: "plays",
    reactions: "likes",
    likes: "likes",
    comments: "comments",
    saves: "saves",
    shares: "shares",
    clicks: "link_clicks",
  };
  const out: Record<string, number> = {};
  for (const m of metrics) {
    const col = map[m.name.toLowerCase()] ?? map[m.type.toLowerCase()];
    if (col && Number.isFinite(m.value)) out[col] = Math.max(out[col] ?? 0, m.value);
  }
  return out;
};
