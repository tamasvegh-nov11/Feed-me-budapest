export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;
const ADMIN_CONTENT_KEY = process.env.ADMIN_CONTENT_KEY;

const allowedStatuses = [
  "draft",
  "ready_for_review",
  "approved",
  "scheduled",
  "published",
  "rejected",
  "failed",
];

function checkAdmin(adminKey) {
  return Boolean(
    ADMIN_CONTENT_KEY &&
      adminKey &&
      adminKey === ADMIN_CONTENT_KEY
  );
}

function supabaseHeaders(extra = {}) {
  return {
    apikey: SUPABASE_SECRET_KEY,
    Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

export async function POST(request) {
  try {
    const body = await request.json();
    const adminKey = body?.adminKey || "";

    if (!checkAdmin(adminKey)) {
      return Response.json(
        {
          error: "Incorrect admin password.",
          debug: {
            adminKeyConfigured: Boolean(ADMIN_CONTENT_KEY),
            receivedKeyPresent: Boolean(adminKey),
            expectedLength: ADMIN_CONTENT_KEY?.length || 0,
            receivedLength: adminKey.length,
            matches: false,
          },
        },
        { status: 401 }
      );
    }

    if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
      return Response.json(
        {
          error:
            "Supabase environment variables are missing.",
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
          error:
            data?.message ||
            "Could not load content.",
        },
        { status: response.status }
      );
    }

    return Response.json({
      ok: true,
      items: data,
    });
  } catch (error) {
    return Response.json(
      {
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

    const adminKey = body?.adminKey || "";
    const id = body?.id;
    const status = body?.status;

    if (!checkAdmin(adminKey)) {
      return Response.json(
        {
          error: "Incorrect admin password.",
          debug: {
            adminKeyConfigured: Boolean(ADMIN_CONTENT_KEY),
            receivedKeyPresent: Boolean(adminKey),
            expectedLength: ADMIN_CONTENT_KEY?.length || 0,
            receivedLength: adminKey.length,
            matches: false,
          },
        },
        { status: 401 }
      );
    }

    if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
      return Response.json(
        {
          error:
            "Supabase environment variables are missing.",
        },
        { status: 500 }
      );
    }

    if (!id) {
      return Response.json(
        { error: "Missing content ID." },
        { status: 400 }
      );
    }

    if (!allowedStatuses.includes(status)) {
      return Response.json(
        { error: "Invalid status." },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/content_queue?id=eq.${encodeURIComponent(
        id
      )}`,
      {
        method: "PATCH",
        headers: supabaseHeaders({
          Prefer: "return=representation",
        }),
        body: JSON.stringify({
          status,
          error_message: null,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return Response.json(
        {
          error:
            data?.message ||
            "Could not update content.",
        },
        { status: response.status }
      );
    }

    return Response.json({
      ok: true,
      item: data?.[0] || null,
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      { status: 500 }
    );
  }
}
