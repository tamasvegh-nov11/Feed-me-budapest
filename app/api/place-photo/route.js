export const dynamic = "force-dynamic";

export async function GET(request) {
  const { searchParams } = new URL(request.url);

  const placeId = searchParams.get("placeId");
  const indexRaw = searchParams.get("index");

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    return Response.json(
      { error: "Google Places API key missing" },
      { status: 500 }
    );
  }

  if (!placeId) {
    return Response.json(
      { error: "Missing placeId" },
      { status: 400 }
    );
  }

  const index = Number.isInteger(Number(indexRaw))
    ? Number(indexRaw)
    : 0;

  try {
    const detailsResponse = await fetch(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(
        placeId
      )}`,
      {
        headers: {
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "photos"
        },
        cache: "no-store"
      }
    );

    if (!detailsResponse.ok) {
      return Response.json(
        { error: "Could not load place photos" },
        { status: 502 }
      );
    }

    const place = await detailsResponse.json();
    const photos = place?.photos || [];

    if (!photos.length) {
      return Response.json(
        { error: "No photos found" },
        { status: 404 }
      );
    }

    const safeIndex =
      index >= 0 && index < photos.length ? index : 0;

    const photo = photos[safeIndex];

    if (!photo?.name) {
      return Response.json(
        { error: "Photo unavailable" },
        { status: 404 }
      );
    }

    const photoResponse = await fetch(
      `https://places.googleapis.com/v1/${photo.name}/media?maxWidthPx=1200&skipHttpRedirect=true`,
      {
        headers: {
          "X-Goog-Api-Key": apiKey
        },
        cache: "no-store"
      }
    );

    if (!photoResponse.ok) {
      return Response.json(
        { error: "Could not load photo media" },
        { status: 502 }
      );
    }

    const photoData = await photoResponse.json();

    if (!photoData?.photoUri) {
      return Response.json(
        { error: "Photo URL missing" },
        { status: 404 }
      );
    }

    return Response.json({
      url: photoData.photoUri,
      attribution:
        photo.authorAttributions?.[0]?.displayName || null,
      attributionUri:
        photo.authorAttributions?.[0]?.uri || null
    });
  } catch {
    return Response.json(
      { error: "Unexpected error" },
      { status: 500 }
    );
  }
}
