export const dynamic = "force-dynamic";

const SUPABASE_URL =
  process.env.SUPABASE_URL?.trim();

const SUPABASE_SECRET_KEY =
  process.env.SUPABASE_SECRET_KEY?.trim();

const SITE_URL =
  "https://www.feedme-budapest.com";

const RESTAURANTS = [
  {
    id: "R001",
    name: "Salve Pizza Napoletana Basilica",
  },
  {
    id: "R039",
    name: "Belli di Mamma",
  },
  {
    id: "R002",
    name: "Forni di Napoli Bazilika",
  },
];

function supabaseHeaders(extra = {}) {
  return {
    apikey: SUPABASE_SECRET_KEY,
    "Content-Type": "application/json",
    ...extra,
  };
}

async function getRestaurants() {
  const ids = RESTAURANTS
    .map((item) => `"${item.id}"`)
    .join(",");

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/feed_restaurants?id=in.(${ids})&select=id,name,google_photo_index`,
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
        "Could not load restaurants."
    );
  }

  return data;
}

function getCachedPhotoUrl(
  restaurantId,
  photoIndex
) {
  /*
    We stored the selected Google photo
    under this deterministic path.
  */

  const id =
    restaurantId.toLowerCase();

  /*
    Selected source files can be JPG or PNG.
    We first try JPG, then PNG.
  */

  return {
    jpg:
      `${SUPABASE_URL}/storage/v1/object/public/feed-media/restaurants/${id}/photo-${photoIndex}.jpg`,

    png:
      `${SUPABASE_URL}/storage/v1/object/public/feed-media/restaurants/${id}/photo-${photoIndex}.png`,
  };
}

async function urlExists(url) {
  try {
    const response = await fetch(
      url,
      {
        method: "HEAD",
        cache: "no-store",
      }
    );

    return response.ok;
  } catch {
    return false;
  }
}

async function resolvePhotoUrl(
  restaurantId,
  photoIndex
) {
  const urls =
    getCachedPhotoUrl(
      restaurantId,
      photoIndex
    );

  if (await urlExists(urls.jpg)) {
    return urls.jpg;
  }

  if (await urlExists(urls.png)) {
    return urls.png;
  }

  throw new Error(
    `Cached source photo not found for ${restaurantId}.`
  );
}

async function buildAndCacheSlide(
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

  const data =
    await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error ||
        `Could not build slide for ${restaurantId}.`
    );
  }

  if (!data?.publicUrl) {
    throw new Error(
      `Slide URL missing for ${restaurantId}.`
    );
  }

  return data.publicUrl;
}

async function createQueueItem(
  slideUrls
) {
  const caption = `Looking for pizza in Budapest? 🍕

Here are 3 spots worth saving for your trip:

1. Salve Pizza Napoletana Basilica
2. Belli di Mamma
3. Forni di Napoli Bazilika

Each one made the Feed Me Budapest guide for a different reason.

Save this post for later and discover more Budapest food picks at feedme-budapest.com.

#budapestpizza #budapestfood #budapestguide #neapolitanpizza #feedmebudapest`;

  const slideText = [
    {
      slide: 1,
      restaurant:
        "Salve Pizza Napoletana Basilica",
    },
    {
      slide: 2,
      restaurant:
        "Belli di Mamma",
    },
    {
      slide: 3,
      restaurant:
        "Forni di Napoli Bazilika",
    },
  ];

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/content_queue`,
    {
      method: "POST",
      headers: supabaseHeaders({
        Prefer:
          "return=representation",
      }),
      body: JSON.stringify({
        title:
          "3 pizza spots to save in Budapest",

        content_type:
          "carousel",

        topic:
          "pizza-guide",

        caption,

        slide_text:
          slideText,

        media_urls:
          slideUrls,

        source_restaurant_ids:
          [
            "R001",
            "R039",
            "R002",
          ],

        salve_featured:
          true,

        status:
          "ready_for_review",

        generation_notes:
          "Automatically assembled from selected restaurant photos and Feed Me Budapest branded restaurant-slide template.",
      }),
    }
  );

  const data =
    await response.json();

  if (!response.ok) {
    throw new Error(
      data?.message ||
        data?.error ||
        "Could not create content_queue item."
    );
  }

  return data?.[0] || null;
}

export async function POST() {
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

    const restaurants =
      await getRestaurants();

    const ordered =
      RESTAURANTS.map(
        (expected) => {
          const found =
            restaurants.find(
              (item) =>
                item.id ===
                expected.id
            );

          if (!found) {
            throw new Error(
              `Restaurant ${expected.id} not found.`
            );
          }

          return found;
        }
      );

    const slideUrls = [];

    for (const restaurant of ordered) {
      const photoIndex =
        Number(
          restaurant.google_photo_index
        );

      if (
        !Number.isInteger(
          photoIndex
        )
      ) {
        throw new Error(
          `No selected photo index for ${restaurant.name}.`
        );
      }

      const photoUrl =
        await resolvePhotoUrl(
          restaurant.id,
          photoIndex
        );

      const slideUrl =
        await buildAndCacheSlide(
          restaurant.id,
          photoUrl
        );

      slideUrls.push(
        slideUrl
      );
    }

    const queueItem =
      await createQueueItem(
        slideUrls
      );

    return Response.json({
      ok: true,

      title:
        "3 pizza spots to save in Budapest",

      slides:
        slideUrls,

      queueItem,
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
