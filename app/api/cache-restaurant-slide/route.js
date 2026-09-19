export const dynamic = "force-dynamic";

const SUPABASE_URL =
  process.env.SUPABASE_URL?.trim();

const SUPABASE_SECRET_KEY =
  process.env.SUPABASE_SECRET_KEY?.trim();

function safeName(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function uploadToSupabase({
  bytes,
  path,
}) {
  const uploadUrl =
    `${SUPABASE_URL}/storage/v1/object/feed-media/${path}`;

  const response = await fetch(
    uploadUrl,
    {
      method: "POST",
      headers: {
        apikey:
          SUPABASE_SECRET_KEY,
        "Content-Type":
          "image/png",
        "x-upsert":
          "true",
      },
      body: bytes,
    }
  );

  const data =
    await response
      .json()
      .catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.message ||
        data?.error ||
        `Supabase upload failed with HTTP ${response.status}`
    );
  }

  return `${SUPABASE_URL}/storage/v1/object/public/feed-media/${path}`;
}

export async function POST(
  request
) {
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
        {
          status: 500,
        }
      );
    }

    const body =
      await request.json();

    const restaurantId =
      body?.restaurantId?.trim();

    const photoUrl =
      body?.photoUrl?.trim();

    if (!restaurantId) {
      return Response.json(
        {
          ok: false,
          error:
            "restaurantId is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!photoUrl) {
      return Response.json(
        {
          ok: false,
          error:
            "photoUrl is required.",
        },
        {
          status: 400,
        }
      );
    }

    /*
      Call our own slide generator
      and receive the finished PNG.
    */

    const slideResponse =
      await fetch(
        new URL(
          "/api/build-restaurant-slide",
          request.url
        ),
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body:
            JSON.stringify({
              restaurantId,
              photoUrl,
            }),
          cache: "no-store",
        }
      );

    if (!slideResponse.ok) {
      const errorData =
        await slideResponse
          .json()
          .catch(() => null);

      throw new Error(
        errorData?.error ||
          `Slide generation failed with HTTP ${slideResponse.status}`
      );
    }

    const contentType =
      slideResponse.headers.get(
        "content-type"
      ) || "";

    if (
      !contentType.startsWith(
        "image/"
      )
    ) {
      throw new Error(
        `Slide generator did not return an image. Content-Type: ${
          contentType ||
          "unknown"
        }`
      );
    }

    const arrayBuffer =
      await slideResponse.arrayBuffer();

    const bytes =
      new Uint8Array(
        arrayBuffer
      );

    const safeRestaurant =
      safeName(
        restaurantId
      );

    const path =
      `slides/${safeRestaurant}/restaurant-slide.png`;

    const publicUrl =
      await uploadToSupabase({
        bytes,
        path,
      });

    return Response.json({
      ok: true,
      restaurantId,
      storagePath: path,
      publicUrl,
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
      {
        status: 500,
      }
    );
  }
}
