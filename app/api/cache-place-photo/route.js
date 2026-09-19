export const dynamic = "force-dynamic";

const SUPABASE_URL =
  process.env.SUPABASE_URL?.trim();

const SUPABASE_SECRET_KEY =
  process.env.SUPABASE_SECRET_KEY?.trim();

const BUCKET = "feed-media";

function json(data, status = 200) {
  return Response.json(data, { status });
}

function safeFileName(value = "") {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function POST(request) {
  try {
    if (
      !SUPABASE_URL ||
      !SUPABASE_SECRET_KEY
    ) {
      return json(
        {
          ok: false,
          error:
            "Supabase configuration is missing.",
        },
        500
      );
    }

    const body =
      await request.json();

    const sourceUrl =
      body?.sourceUrl;

    const requestedName =
      body?.fileName;

    if (
      !sourceUrl ||
      typeof sourceUrl !== "string"
    ) {
      return json(
        {
          ok: false,
          error:
            "sourceUrl is required.",
        },
        400
      );
    }

    if (
      !sourceUrl.startsWith("https://")
    ) {
      return json(
        {
          ok: false,
          error:
            "sourceUrl must use HTTPS.",
        },
        400
      );
    }

    /*
      1. DOWNLOAD IMAGE
    */

    const sourceResponse =
      await fetch(sourceUrl, {
        cache: "no-store",
        redirect: "follow",
      });

    if (!sourceResponse.ok) {
      return json(
        {
          ok: false,
          error:
            `Source returned HTTP ${sourceResponse.status}.`,
        },
        400
      );
    }

    const contentType =
      sourceResponse.headers.get(
        "content-type"
      ) || "";

    if (
      !contentType.startsWith("image/")
    ) {
      return json(
        {
          ok: false,
          error:
            `Source did not return an image. Content-Type: ${contentType || "unknown"}`,
        },
        400
      );
    }

    const bytes =
      await sourceResponse.arrayBuffer();

    /*
      2. DETERMINE FILE EXTENSION
    */

    let extension = "jpg";

    if (
      contentType.includes("png")
    ) {
      extension = "png";
    } else if (
      contentType.includes("webp")
    ) {
      extension = "webp";
    } else if (
      contentType.includes("gif")
    ) {
      extension = "gif";
    }

    /*
      3. CREATE SAFE STORAGE PATH
    */

    const baseName =
      safeFileName(
        requestedName ||
          `feed-${Date.now()}`
      ) || `feed-${Date.now()}`;

    const objectPath =
      `restaurant-photos/${baseName}.${extension}`;

    /*
      4. UPLOAD TO SUPABASE STORAGE
    */

    const uploadResponse =
      await fetch(
        `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${objectPath}`,
        {
          method: "POST",
          headers: {
            apikey:
              SUPABASE_SECRET_KEY,
            Authorization:
              `Bearer ${SUPABASE_SECRET_KEY}`,
            "Content-Type":
              contentType,
            "x-upsert": "true",
          },
          body: bytes,
        }
      );

    const uploadText =
      await uploadResponse.text();

    if (!uploadResponse.ok) {
      return json(
        {
          ok: false,
          error:
            `Supabase upload failed: ${uploadText}`,
        },
        uploadResponse.status
      );
    }

    /*
      5. PUBLIC URL
    */

    const publicUrl =
      `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${objectPath}`;

    return json({
      ok: true,
      bucket: BUCKET,
      path: objectPath,
      publicUrl,
      contentType,
      bytes:
        bytes.byteLength,
    });
  } catch (error) {
    return json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      500
    );
  }
}
