export async function GET(request) {
  const { searchParams } = new URL(request.url);

  const placeId = searchParams.get("placeId");
  const photoIndex = Number(searchParams.get("photoIndex") || "0");

  if (!placeId) {
    return new Response("Missing placeId", { status: 400 });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    return new Response("Missing Google Places API key", { status: 500 });
  }

  try {
    const placeResponse = await fetch(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
      {
        headers: {
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "photos",
        },
        cache: "force-cache",
      }
    );

    if (!placeResponse.ok) {
      return new Response("Google Place lookup failed", {
        status: placeResponse.status,
      });
    }

    const placeData = await placeResponse.json();

    if (!placeData.photos || placeData.photos.length === 0) {
      return new Response("No photo found", { status: 404 });
    }

    const safeIndex =
      photoIndex >= 0 && photoIndex < placeData.photos.length
        ? photoIndex
        : 0;

    const photoName = placeData.photos[safeIndex].name;

    const photoResponse = await fetch(
      `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=1200&skipHttpRedirect=true`,
      {
        headers: {
          "X-Goog-Api-Key": apiKey,
        },
        cache: "force-cache",
      }
    );

    if (!photoResponse.ok) {
      return new Response("Google photo lookup failed", {
        status: photoResponse.status,
      });
    }

    const photoData = await photoResponse.json();

    if (!photoData.photoUri) {
      return new Response("No photo URL returned", { status: 404 });
    }

    return Response.redirect(photoData.photoUri, 302);
  } catch (error) {
    console.error("place-photo error:", error);

    return new Response("Photo proxy error", { status: 500 });
  }
}
