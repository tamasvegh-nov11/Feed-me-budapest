export const dynamic = "force-dynamic";

const SUPABASE_URL =
  process.env.SUPABASE_URL?.trim();

const SUPABASE_SECRET_KEY =
  process.env.SUPABASE_SECRET_KEY?.trim();

const ADMIN_CONTENT_KEY =
  process.env.ADMIN_CONTENT_KEY?.trim();

const BUCKET = "feed-media";

function isAuthorized(adminKey) {
  return Boolean(
    ADMIN_CONTENT_KEY &&
      adminKey &&
      adminKey === ADMIN_CONTENT_KEY
  );
}

function safeFilePart(value = "") {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function uploadToSupabase({
  path,
  bytes,
  contentType,
}) {
  const response = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`,
    {
      method: "POST",
      headers: {
        apikey: SUPABASE_SECRET_KEY,
        Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
        "Content-Type": contentType,
        "x-upsert": "true",
      },
      body: bytes,
    }
  );

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.message ||
        data?.error ||
        `Supabase upload failed (${response.status})`
    );
  }
}

export async function POST(request) {
  try {
    if (
      !SUPABASE_URL ||
      !SUPABASE_SECRET_KEY
    ) {
      return Response.json(
        {
          ok: false,
          error:
            "Supabase configuration is missing.",
        },
        { status: 500 }
      );
    }

    const body = await request.json();

    const adminKey =
      body?.adminKey || "";

    const sourceUrl =
      body?.sourceUrl || "";

    const restaurantId =
      body?.restaurantId || "restaurant";

    const photoIndex =
      Number.isFinite(
        Number(body?.photoIndex)
      )
        ? Number(body.photoIndex)
        : 0;

    if (!isAuthorized(adminKey)) {
      return Response.json(
        {
          ok: false,
          error:
            "Incorrect admin password.",
        },
        { status: 401 }
      );
    }

    if (
      typeof sourceUrl !== "string" ||
      !sourceUrl.startsWith("https://")
    ) {
      return Response.json(
        {
          ok: false,
          error:
            "A valid HTTPS sourceUrl is required.",
        },
        { status: 400 }
      );
    }

    const sourceResponse =
      await fetch(sourceUrl, {
        cache: "no-store",
      });

    if (!sourceResponse.ok) {
      throw new Error(
        `Could not download source image (${sourceResponse.status})`
      );
    }

    const contentType =
      sourceResponse.headers.get(
        "content-type"
      ) || "image/jpeg";

    if (
      !contentType.startsWith("image/")
    ) {
      throw new Error(
        `Source URL did not return an image (${contentType})`
      );
    }

    const bytes =
      await sourceResponse.arrayBuffer();

    const extension =
      contentType.includes("png")
        ? "png"
        : contentType.includes("webp")
        ? "webp"
        : "jpg";

    const id =
      safeFilePart(restaurantId) ||
      "restaurant";

    const path =
      `restaurants/${id}/photo-${photoIndex}.${extension}`;

    await uploadToSupabase({
      path,
      bytes,
      contentType,
    });

    const publicUrl =
      `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;

    return Response.json({
      ok: true,
      bucket: BUCKET,
      path,
      publicUrl,
      contentType,
      bytes: bytes.byteLength,
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      { status: 500 }
    );
  }
}
