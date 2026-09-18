export const dynamic = "force-dynamic";

const THIRTY_DAYS = 60 * 60 * 24 * 30;

async function findPlaceIdByName(name, apiKey) {
  const response = await fetch(
    "https://places.googleapis.com/v1/places:searchText",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress",
      },
      body: JSON.stringify({
        textQuery: `${name}, Budapest, Hungary`,
        maxResultCount: 1,
      }),
      next: {
        revalidate: THIRTY_DAYS,
      },
    }
  );

  if (!response.ok) {
    return null;
  }

  const data = await response.json();

  return data?.places?.[0]?.id || null;
}

async function getPlacePhotos(placeId, apiKey) {
  const response = await fetch(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(
      placeId
    )}`,
    {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "photos",
      },
      next: {
        revalidate: THIRTY_DAYS,
      },
    }
  );

  if (!response.ok) {
    return null;
  }

  return response.json();
}

async function getPhotoUrl(photoName, apiKey) {
  const response = await fetch(
    `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=1200&skipHttpRedirect=true`,
    {
      headers: {
        "X-Goog-Api-Key": apiKey,
      },
      next: {
        revalidate: THIRTY_DAYS,
      },
    }
  );

  if (!response.ok) {
    return null;
  }

  return response.json();
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);

  const placeIdFromQuery = searchParams.get("placeId");
  const name = searchParams.get("name");

  const indexRaw = searchParams.get("index");
  const index = Number.isInteger(Number(indexRaw))
    ? Number(indexRaw)
    : 0;

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    return Response.json(
      { error: "Google Places API key missing" },
      { status: 500 }
    );
  }

  let placeId = placeIdFromQuery;

  if (!placeId && name) {
    placeId = await findPlaceIdByName(name, apiKey);
  }

  if (!placeId) {
    return Response.json(
      { error: "Place not found" },
      { status: 404 }
    );
  }

  try {
    const place = await getPlacePhotos(placeId, apiKey);

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

    const photoData = await getPhotoUrl(
      photo.name,
      apiKey
    );

    if (!photoData?.photoUri) {
      return Response.json(
        { error: "Photo URL missing" },
        { status: 404 }
      );
    }

    return Response.json({
      url: photoData.photoUri,
      placeId,
      attribution:
        photo.authorAttributions?.[0]?.displayName || null,
      attributionUri:
        photo.authorAttributions?.[0]?.uri || null,
    });
  } catch {
    return Response.json(
      { error: "Unexpected error" },
      { status: 500 }
    );
  }
}
