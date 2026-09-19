export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.SUPABASE_URL?.trim();
const SUPABASE_SECRET_KEY =
  process.env.SUPABASE_SECRET_KEY?.trim();

function safeName(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function getImageFromSource(sourceUrl) {
  const response = await fetch(sourceUrl, {
    redirect: "follow",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Source returned HTTP ${response.status}`
    );
  }

  const contentType =
    response.headers.get("content-type") || "";

  if (!contentType.startsWith("image/")) {
    throw new Error(
      `Source did not return an image. Content-Type: ${
        contentType || "unknown"
      }`
    );
  }

  const arrayBuffer =
    await response.arrayBuffer();

  return {
    bytes: new Uint8Array(arrayBuffer),
    contentType,
  };
}

async function uploadToSupabase({
  bytes,
  contentType,
  path,
}) {
  const uploadUrl =
    `${SUPABASE_URL}/storage/v1/object/feed-media/${path}`;

  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      apikey: SUPABASE_SECRET_KEY,
      "Content-Type": contentType,
      "x-upsert": "true",
    },
    body: bytes,
  });

  const data =
    await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.message ||
        data?.error ||
        `Supabase upload failed with HTTP ${response.status}`
    );
  }

  return `${SUPABASE_URL}/storage/v1/object/public/feed-media/${path}`;
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
            "Supabase environment variables are missing.",
        },
        { status: 500 }
      );
    }

    const body = await request.json();

    const sourceUrlRaw =
      body?.sourceUrl?.trim();

    const restaurantId =
      body?.restaurantId?.trim();

    const restaurantName =
      body?.restaurantName?.trim();

    const photoIndex =
      Number.isInteger(body?.photoIndex)
        ? body.photoIndex
        : 0;

    if (!sourceUrlRaw) {
      return Response.json(
        {
          ok: false,
          error: "sourceUrl is required.",
        },
        { status: 400 }
      );
    }

    if (
      !restaurantId &&
      !restaurantName
    ) {
      return Response.json(
        {
          ok: false,
          error:
            "restaurantId or restaurantName is required.",
        },
        { status: 400 }
      );
    }

    /*
      This is the important fix:
      relative URLs like /api/place-photo?... are
      converted into a full URL automatically.
    */
    const sourceUrl =
      new URL(
        sourceUrlRaw,
        request.url
      ).toString();

    const image =
      await getImageFromSource(
        sourceUrl
      );

    let extension = "jpg";

    if (
      image.contentType.includes("png")
    ) {
      extension = "png";
    } else if (
      image.contentType.includes("webp")
    ) {
      extension = "webp";
    }

    const base =
      safeName(
        restaurantId ||
          restaurantName
      ) || "restaurant";

    const path =
      `restaurants/${base}/photo-${photoIndex}.${extension}`;

    const publicUrl =
      await uploadToSupabase({
        bytes: image.bytes,
        contentType:
          image.contentType,
        path,
      });

    return Response.json({
      ok: true,
      restaurantId:
        restaurantId || null,
      restaurantName:
        restaurantName || null,
      photoIndex,
      sourceUrl,
      storagePath: path,
      publicUrl,
      contentType:
        image.contentType,
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
