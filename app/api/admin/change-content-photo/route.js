export const dynamic = "force-dynamic";

const SUPABASE_URL =
  process.env.SUPABASE_URL?.trim();

const SUPABASE_SECRET_KEY =
  process.env.SUPABASE_SECRET_KEY?.trim();

const ADMIN_CONTENT_KEY =
  process.env.ADMIN_CONTENT_KEY?.trim();

const SITE_URL =
  "https://www.feedme-budapest.com";

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
    "Content-Type": "application/json",
    ...extra,
  };
}

async function getContentItem(id) {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/content_queue?id=eq.${encodeURIComponent(
      id
    )}&select=*`,
    {
      headers: supabaseHeaders(),
      cache: "no-store",
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.message ||
        data?.error ||
        "Could not load content item."
    );
  }

  if (!data?.[0]) {
    throw new Error(
      "Content item not found."
    );
  }

  return data[0];
}

async function getRestaurant(id) {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/feed_restaurants?id=eq.${encodeURIComponent(
      id
    )}&select=id,name,google_place_id,google_photo_index`,
    {
      headers: supabaseHeaders(),
      cache: "no-store",
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.message ||
        data?.error ||
        "Could not load restaurant."
    );
  }

  if (!data?.[0]) {
    throw new Error(
      "Restaurant not found."
    );
  }

  return data[0];
}

async function getPhotoCandidate(
  restaurant,
  index
) {
  const response = await fetch(
    `${SITE_URL}/api/place-photo?placeId=${encodeURIComponent(
      restaurant.google_place_id
    )}&index=${index}`,
    {
      cache: "no-store",
    }
  );

  const data = await response.json();

  if (
    !response.ok ||
    !data?.url
  ) {
    return null;
  }

  return {
    index,
    url: data.url,
    attribution:
      data.attribution || null,
    attributionUri:
      data.attributionUri || null,
  };
}

async function cachePhoto(
  restaurant,
  sourceUrl,
  photoIndex
) {
  const response = await fetch(
    `${SITE_URL}/api/cache-place-photo`,
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify({
        restaurantId:
          restaurant.id,

        restaurantName:
          restaurant.name,

        photoIndex,

        sourceUrl,
      }),

      cache: "no-store",
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error ||
        "Could not cache selected photo."
    );
  }

  if (!data?.publicUrl) {
    throw new Error(
      "Cached photo URL missing."
    );
  }

  return data.publicUrl;
}

async function buildSlide(
  restaurantId,
  photoUrl
) {
  const response = await fetch(
    `${SITE_URL}/api/cache-restaurant-slide`,
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify({
        restaurantId,
        photoUrl,
      }),

      cache: "no-store",
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error ||
        "Could not rebuild slide."
    );
  }

  if (!data?.publicUrl) {
    throw new Error(
      "Generated slide URL missing."
    );
  }

  return data.publicUrl;
}

async function updateQueueItem(
  id,
  mediaUrls
) {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/content_queue?id=eq.${encodeURIComponent(
      id
    )}`,
    {
      method: "PATCH",

      headers:
        supabaseHeaders({
          Prefer:
            "return=representation",
        }),

      body: JSON.stringify({
        media_urls:
          mediaUrls,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.message ||
        data?.error ||
        "Could not update carousel."
    );
  }

  return data?.[0] || null;
}

async function updateRestaurantPhotoIndex(
  restaurantId,
  photoIndex
) {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/feed_restaurants?id=eq.${encodeURIComponent(
      restaurantId
    )}`,
    {
      method: "PATCH",

      headers:
        supabaseHeaders(),

      body: JSON.stringify({
        google_photo_index:
          photoIndex,
      }),
    }
  );

  if (!response.ok) {
    const data =
      await response
        .json()
        .catch(() => null);

    throw new Error(
      data?.message ||
        data?.error ||
        "Could not save preferred photo."
    );
  }
}

/*
  POST
  Returns selectable Google photos
  for one slide / restaurant.
*/

export async function POST(request) {
  try {
    const body =
      await request.json();

    const adminKey =
      body?.adminKey || "";

    const contentId =
      body?.contentId;

    const slideIndex =
      Number(body?.slideIndex);

    if (!isAuthorized(adminKey)) {
      return Response.json(
        {
          ok: false,
          error:
            "Incorrect admin password.",
        },
        {
          status: 401,
        }
      );
    }

    if (!contentId) {
      return Response.json(
        {
          ok: false,
          error:
            "contentId is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !Number.isInteger(
        slideIndex
      )
    ) {
      return Response.json(
        {
          ok: false,
          error:
            "slideIndex is required.",
        },
        {
          status: 400,
        }
      );
    }

    const item =
      await getContentItem(
        contentId
      );

    const restaurantIds =
      item.source_restaurant_ids ||
      [];

    const restaurantId =
      restaurantIds[
        slideIndex
      ];

    if (!restaurantId) {
      return Response.json(
        {
          ok: false,
          error:
            "No restaurant connected to this slide.",
        },
        {
          status: 400,
        }
      );
    }

    const restaurant =
      await getRestaurant(
        restaurantId
      );

    if (
      !restaurant.google_place_id
    ) {
      return Response.json(
        {
          ok: false,
          error:
            `Google Place ID missing for ${restaurant.name}.`,
        },
        {
          status: 400,
        }
      );
    }

    const candidates =
      await Promise.all(
        Array.from(
          {
            length: 8,
          },
          (_, index) =>
            getPhotoCandidate(
              restaurant,
              index
            )
        )
      );

    return Response.json({
      ok: true,

      restaurant: {
        id:
          restaurant.id,

        name:
          restaurant.name,

        selectedPhotoIndex:
          restaurant.google_photo_index,
      },

      photos:
        candidates.filter(
          Boolean
        ),
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

/*
  PATCH
  Select photo, rebuild one slide,
  replace it inside the existing carousel.
*/

export async function PATCH(request) {
  try {
    const body =
      await request.json();

    const adminKey =
      body?.adminKey || "";

    const contentId =
      body?.contentId;

    const slideIndex =
      Number(body?.slideIndex);

    const photoIndex =
      Number(body?.photoIndex);

    const sourceUrl =
      body?.sourceUrl;

    if (!isAuthorized(adminKey)) {
      return Response.json(
        {
          ok: false,
          error:
            "Incorrect admin password.",
        },
        {
          status: 401,
        }
      );
    }

    if (!contentId) {
      throw new Error(
        "contentId is required."
      );
    }

    if (
      !Number.isInteger(
        slideIndex
      )
    ) {
      throw new Error(
        "Invalid slideIndex."
      );
    }

    if (
      !Number.isInteger(
        photoIndex
      )
    ) {
      throw new Error(
        "Invalid photoIndex."
      );
    }

    if (!sourceUrl) {
      throw new Error(
        "sourceUrl is required."
      );
    }

    const item =
      await getContentItem(
        contentId
      );

    if (
      item.status !==
      "ready_for_review"
    ) {
      throw new Error(
        "Photos can only be changed while content is Pending."
      );
    }

    const restaurantId =
      item.source_restaurant_ids?.[
        slideIndex
      ];

    if (!restaurantId) {
      throw new Error(
        "Restaurant ID missing for slide."
      );
    }

    const restaurant =
      await getRestaurant(
        restaurantId
      );

    const cachedPhoto =
      await cachePhoto(
        restaurant,
        sourceUrl,
        photoIndex
      );

    const newSlideUrl =
      await buildSlide(
        restaurant.id,
        cachedPhoto
      );

    const mediaUrls =
      Array.isArray(
        item.media_urls
      )
        ? [...item.media_urls]
        : [];

    mediaUrls[
      slideIndex
    ] = newSlideUrl;

    const updated =
      await updateQueueItem(
        contentId,
        mediaUrls
      );

    /*
      Save this choice as preferred
      for future generated posts too.
    */

    await updateRestaurantPhotoIndex(
      restaurant.id,
      photoIndex
    );

    return Response.json({
      ok: true,

      restaurant: {
        id:
          restaurant.id,

        name:
          restaurant.name,

        photoIndex,
      },

      slideUrl:
        newSlideUrl,

      item:
        updated,
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
