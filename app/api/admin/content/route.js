export const dynamic = "force-dynamic";

const VERSION = "FMB-ADMIN-V3";

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
    Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

// Ezzel tudjuk ellenőrizni, hogy tényleg az új route fut.
export async function GET() {
  return Response.json({
    ok: true,
    version: VERSION,
    adminKeyConfigured: Boolean(ADMIN_CONTENT_KEY),
  });
}

// Belépés + tartalmak lekérése
export async function POST(request) {
  try {
    const body = await request.json();
    const adminKey = body?.adminKey || "";

    if (!isAuthorized(adminKey)) {
      return Response.json(
        {
          ok: false,
          version: VERSION,
          error: "Incorrect admin password.",
          receivedLength: adminKey.length,
          expectedLength: ADMIN_CONTENT_KEY?.length || 0,
        },
        { status: 401 }
      );
    }

    if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
      return Response.json(
        {
          ok: false,
          version: VERSION,
          error: "Supabase configuration is missing.",
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
          error: data?.message || "Could not load content.",
        },
        { status: response.status }
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

// Approve / Reject
export async function PATCH(request) {
  try {
    const body = await request.json();

    const adminKey = body?.adminKey || "";
    const id = body?.id;
    const status = body?.status;

    if (!isAuthorized(adminKey)) {
      return Response.json(
        {
          ok: false,
          version: VERSION,
          error: "Incorrect admin password.",
        },
        { status: 401 }
      );
    }

    if (!id) {
      return Response.json(
        {
          ok: false,
          error: "Missing content ID.",
        },
        { status: 400 }
      );
    }

    if (!allowedStatuses.includes(status)) {
      return Response.json(
        {
          ok: false,
          error: "Invalid status.",
        },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/content_queue?id=eq.${encodeURIComponent(id)}`,
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
          ok: false,
          version: VERSION,
          error: data?.message || "Could not update content.",
        },
        { status: response.status }
      );
    }

    return Response.json({
      ok: true,
      version: VERSION,
      item: data?.[0] || null,
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
