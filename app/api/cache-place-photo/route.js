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

async function fetchActualImage(sourceUrl) {
  /*
    STEP 1:
    Fetch the supplied source.
    This may already be an image,
    OR it may be our /api/place-photo JSON response.
  */

  const sourceResponse = await fetch(sourceUrl, {
    redirect: "follow",
    cache: "no-store",
  });

  if (!sourceResponse.ok) {
    throw new Error(
      `Source returned HTTP ${sourceResponse.status}`
    );
  }

  const sourceContentType =
    sourceResponse.headers.get("content-type") || "";

  /*
    CASE A:
    Source already returned an image.
  */

  if (sourceContentType.startsWith("image/")) {
    const arrayBuffer =
      await sourceResponse.arrayBuffer();

    return {
      bytes: new Uint8Array(arrayBuffer),
      contentType: sourceContentType,
      finalSourceUrl: sourceUrl,
      attribution: null,
      attributionUri: null,
    };
  }

  /*
    CASE B:
    Our place-photo endpoint returned JSON
    containing the real Google photo URL.
  */

  if (sourceContentType.includes("application/json")) {
    const sourceData =
      await sourceResponse.json();

    if (!sourceData?.url) {
      throw new Error(
        sourceData?.error ||
          "Photo JSON did not contain a URL."
      );
    }

    const actualPhotoUrl =
      sourceData.url;

    const imageResponse =
      await fetch(actualPhotoUrl, {
        redirect: "follow",
        cache: "no-store",
      });

    if (!imageResponse.ok) {
      throw new Error(
        `Google photo returned HTTP ${imageResponse.status}`
      );
    }

    const imageContentType =
      imageResponse.headers.get("content-type") || "";

    if (!imageContentType.startsWith("image/")) {
      throw new Error(
        `Google photo did not return an image. Content-Type: ${
          imageContentType || "unknown"
        }`
      );
    }

    const arrayBuffer =
      await imageResponse.arrayBuffer();

    return {
      bytes: new Uint8Array(arrayBuffer),
      contentType: imageContentType,
      finalSourceUrl: actualPhotoUrl,
      attribution:
        sourceData.attribution || null,
      attributionUri:
        sourceData.attributionUri || null,
    };
  }

  throw new Error(
    `Unsupported source Content-Type: ${
      sourceContentType || "unknown"
    }`
  );
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

  return (
    `${SUPABASE_URL}/storage/v1/object/public/feed-media/${path}`
  );
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

    const body =
      await request.json();

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
      Convert relative URL into full URL.
    */

    const sourceUrl =
      new URL(
        sourceUrlRaw,
        request.url
      ).toString();

    /*
      Get the real image bytes.
    */

    const image =
      await fetchActualImage(
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
    } else if (
      image.contentType.includes("jpeg")
    ) {
      extension = "jpg";
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

      storagePath:
        path,

      publicUrl,

      contentType:
        image.contentType,

      attribution:
        image.attribution,

      attributionUri:
        image.attributionUri,
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
