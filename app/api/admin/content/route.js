export const dynamic = "force-dynamic";

const VERSION = "FMB-ADMIN-V5";

const SUPABASE_URL = process.env.SUPABASE_URL?.trim();
const SUPABASE_SECRET_KEY =
  process.env.SUPABASE_SECRET_KEY?.trim();
const ADMIN_CONTENT_KEY =
  process.env.ADMIN_CONTENT_KEY?.trim();
const BUFFER_API_KEY =
  process.env.BUFFER_API_KEY?.trim();

const allowedStatuses = [
  "draft",
  "ready_for_review",
  "approved",
  "scheduled",
  "published",
  "rejected",
  "failed",
];

function isAuthorized(adminKey) {
  return Boolean(
    ADMIN_CONTENT_KEY &&
      adminKey &&
      adminKey === ADMIN_CONTENT_KEY
  );
}

function supabaseHeaders(extra = {}) {
  return {
    apikey: SUPABASE_SECRET_KEY,
    "Content-Type": "application/json",
    ...extra,
  };
}

async function bufferQuery(query) {
  if (!BUFFER_API_KEY) {
    throw new Error("BUFFER_API_KEY is missing.");
  }

  const response = await fetch("https://api.buffer.com", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${BUFFER_API_KEY}`,
    },
    body: JSON.stringify({ query }),
    cache: "no-store",
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      `Buffer HTTP ${response.status}`
    );
  }

  if (data.errors?.length) {
    throw new Error(
      data.errors
        .map((item) => item.message || "Buffer error")
        .join("; ")
    );
  }

  return data;
}

async function getInstagramChannelId() {
  const orgResult = await bufferQuery(`
    query GetOrganizations {
      account {
        organizations {
          id
          name
        }
      }
    }
  `);

  const organizations =
    orgResult.data?.account?.organizations || [];

  for (const org of organizations) {
    const channelResult = await bufferQuery(`
      query GetChannels {
        channels(
          input: {
            organizationId: "${org.id}"
          }
        ) {
          id
          name
          displayName
          service
        }
      }
    `);

    const channels =
      channelResult.data?.channels || [];

    const instagram = channels.find(
      (channel) =>
        channel.service === "instagram"
    );

    if (instagram?.id) {
      return instagram.id;
    }
  }

  throw new Error(
    "No Instagram channel found in Buffer."
  );
}

function escapeGraphQL(value = "") {
  return String(value)
    .replaceAll("\\", "\\\\")
    .replaceAll('"', '\\"')
    .replaceAll("\n", "\\n")
    .replaceAll("\r", "");
}

function normalizeMediaUrls(value) {
  if (!Array.isArray(value)) return [];

  return value.filter(
    (url) =>
      typeof url === "string" &&
      url.startsWith("https://")
  );
}

function instagramMetadata(contentType) {
  if (contentType === "story") {
    return `
      metadata: {
        instagram: {
          type: story
        }
      }
    `;
  }

  if (contentType === "reel") {
    return `
      metadata: {
        instagram: {
          type: reel
          shouldShareToFeed: true
        }
      }
    `;
  }

  if (contentType === "carousel") {
    return `
      metadata: {
        instagram: {
          type: carousel
        }
      }
    `;
  }

  return `
    metadata: {
      instagram: {
        type: post
      }
    }
  `;
}

async function createBufferPost(item) {
  const channelId =
    await getInstagramChannelId();

  const mediaUrls =
    normalizeMediaUrls(item.media_urls);

  if (mediaUrls.length === 0) {
    throw new Error(
      "No public HTTPS media URLs found."
    );
  }

  const caption = escapeGraphQL(
    item.caption || item.title || ""
  );

  const assets = mediaUrls
    .map((url) => {
      const safeUrl =
        escapeGraphQL(url);

      if (item.content_type === "reel") {
        return `
          {
            video: {
              url: "${safeUrl}"
            }
          }
        `;
      }

      return `
        {
          image: {
            url: "${safeUrl}"
          }
        }
      `;
    })
    .join(",");

  const publishAt = item.publish_at
    ? escapeGraphQL(item.publish_at)
    : null;

  const mode = publishAt
    ? "customScheduled"
    : "addToQueue";

  const dueAtLine = publishAt
    ? `dueAt: "${publishAt}"`
    : "";

  const mutation = `
    mutation CreatePost {
      createPost(
        input: {
          text: "${caption}"
          channelId: "${channelId}"
          schedulingType: automatic
          mode: ${mode}
          ${dueAtLine}
          ${instagramMetadata(
            item.content_type
          )}
          assets: [
            ${assets}
          ]
        }
      ) {
        ... on PostActionSuccess {
          post {
            id
            status
            dueAt
          }
        }

        ... on MutationError {
          message
        }
      }
    }
  `;

  const result =
    await bufferQuery(mutation);

  const response =
    result.data?.createPost;

  if (!response) {
    throw new Error(
      "Buffer returned no createPost response."
    );
  }

  if (response.message) {
    throw new Error(
      `Buffer: ${response.message}`
    );
  }

  if (!response.post?.id) {
    throw new Error(
      "Buffer post ID is missing."
    );
  }

  return response.post;
}

async function getContentItem(id) {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/content_queue?id=eq.${encodeURIComponent(
      id
    )}&select=*`,
    {
      headers: supabaseHeaders(),
      cache: "no-store",
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.message ||
        data?.error ||
        "Could not load content item."
    );
  }

  if (!data?.[0]) {
    throw new Error(
      "Content item not found."
    );
  }

  return data[0];
}

async function updateContentItem(
  id,
  updates
) {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/content_queue?id=eq.${encodeURIComponent(
      id
    )}`,
    {
      method: "PATCH",
      headers: supabaseHeaders({
        Prefer: "return=representation",
      }),
      body: JSON.stringify(updates),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.message ||
        data?.error ||
        "Could not update content."
    );
  }

  return data?.[0] || null;
}

export async function GET() {
  return Response.json({
    ok: true,
    version: VERSION,
    adminKeyConfigured: Boolean(
      ADMIN_CONTENT_KEY
    ),
    supabaseConfigured: Boolean(
      SUPABASE_URL &&
        SUPABASE_SECRET_KEY
    ),
    bufferConfigured: Boolean(
      BUFFER_API_KEY
    ),
  });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const adminKey =
      body?.adminKey || "";

    if (!isAuthorized(adminKey)) {
      return Response.json(
        {
          ok: false,
          version: VERSION,
          error:
            "Incorrect admin password.",
          receivedLength:
            adminKey.length,
          expectedLength:
            ADMIN_CONTENT_KEY?.length || 0,
        },
        { status: 401 }
      );
    }

    if (
      !SUPABASE_URL ||
      !SUPABASE_SECRET_KEY
    ) {
      return Response.json(
        {
          ok: false,
          version: VERSION,
          error:
            "Supabase configuration is missing.",
        },
        { status: 500 }
      );
    }

    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/content_queue?select=*&order=created_at.desc`,
      {
        headers: supabaseHeaders(),
        cache: "no-store",
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return Response.json(
        {
          ok: false,
          version: VERSION,
          error:
            data?.message ||
            data?.error ||
            "Could not load content.",
        },
        {
          status: response.status,
        }
      );
    }

    return Response.json({
      ok: true,
      version: VERSION,
      items: data,
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        version: VERSION,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();

    const adminKey =
      body?.adminKey || "";
    const id = body?.id;
    const status = body?.status;

    if (!isAuthorized(adminKey)) {
      return Response.json(
        {
          ok: false,
          version: VERSION,
          error:
            "Incorrect admin password.",
        },
        { status: 401 }
      );
    }

    if (
      !SUPABASE_URL ||
      !SUPABASE_SECRET_KEY
    ) {
      return Response.json(
        {
          ok: false,
          version: VERSION,
          error:
            "Supabase configuration is missing.",
        },
        { status: 500 }
      );
    }

    if (!id) {
      return Response.json(
        {
          ok: false,
          error:
            "Missing content ID.",
        },
        { status: 400 }
      );
    }

    if (!allowedStatuses.includes(status)) {
      return Response.json(
        {
          ok: false,
          error:
            "Invalid status.",
        },
        { status: 400 }
      );
    }

    if (status === "approved") {
      let item;

      try {
        item =
          await getContentItem(id);

        const bufferPost =
          await createBufferPost(item);

        const updated =
          await updateContentItem(
            id,
            {
              status: "scheduled",
              buffer_post_id:
                bufferPost.id,
              error_message: null,
            }
          );

        return Response.json({
          ok: true,
          version: VERSION,
          buffer: {
            id: bufferPost.id,
            status:
              bufferPost.status ||
              null,
            dueAt:
              bufferPost.dueAt ||
              null,
          },
          item: updated,
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unknown Buffer error";

        try {
          await updateContentItem(
            id,
            {
              status: "failed",
              error_message:
                message,
            }
          );
        } catch {
          // Avoid masking the original Buffer error.
        }

        return Response.json(
          {
            ok: false,
            version: VERSION,
            error: message,
          },
          { status: 500 }
        );
      }
    }

    const updated =
      await updateContentItem(
        id,
        {
          status,
          error_message: null,
        }
      );

    return Response.json({
      ok: true,
      version: VERSION,
      item: updated,
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        version: VERSION,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      { status: 500 }
    );
  }
}
