export const dynamic = "force-dynamic";

const SUPABASE_URL =
  process.env.SUPABASE_URL?.trim();

const SUPABASE_SECRET_KEY =
  process.env.SUPABASE_SECRET_KEY?.trim();

const ADMIN_CONTENT_KEY =
  process.env.ADMIN_CONTENT_KEY?.trim();

const SITE_URL =
  "https://www.feedme-budapest.com";

const TOPICS = {
  coffee: {
    title:
      "3 coffee spots worth crossing town for in Budapest",

    topic:
      "coffee-guide",

    restaurantIds: [
      "R079", // Kontakt
      "R008", // Espresso Embassy
      "R062", // Nicaragua
    ],

    intro:
      "Good coffee is worth a detour. ☕️",

    middle:
      "Three Budapest stops, three different moods.",

    outro:
      "Different neighbourhoods, different atmosphere — all worth knowing.\n\nSave this for your next coffee stop in Budapest.",

    hashtags:
      "#budapestcoffee #specialtycoffee #budapestfood #budapestguide #feedmebudapest",
  },

  pizza: {
    title:
      "3 pizza spots to save in Budapest",

    topic:
      "pizza-guide",

    restaurantIds: [
      "R001",
      "R039",
      "R002",
    ],

    intro:
      "Pizza in Budapest? Start here. 🍕",

    middle:
      "Three spots, three different reasons to go.",

    outro:
      "No ranking. Just three places we think are worth knowing.\n\nSave this for your next Budapest pizza night.",

    hashtags:
      "#budapestpizza #budapestfood #budapestguide #neapolitanpizza #feedmebudapest",
  },
};

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
    "Content-Type":
      "application/json",
    ...extra,
  };
}

async function loadRestaurants(ids) {
  const queryIds = ids
    .map((id) => `"${id}"`)
    .join(",");

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/feed_restaurants?id=in.(${queryIds})&select=id,name,why_we_like_it,good_to_know,primary_area,google_place_id,google_photo_index`,
    {
      headers:
        supabaseHeaders(),
      cache: "no-store",
    }
  );

  const data =
    await response.json();

  if (!response.ok) {
    throw new Error(
      data?.message ||
        data?.error ||
        "Could not load restaurants."
    );
  }

  return ids.map((id) => {
    const restaurant =
      data.find(
        (item) =>
          item.id === id
      );

    if (!restaurant) {
      throw new Error(
        `Restaurant ${id} not found.`
      );
    }

    return restaurant;
  });
}

async function getPlacePhoto(
  restaurant
) {
  if (
    !restaurant.google_place_id
  ) {
    throw new Error(
      `Google Place ID missing for ${restaurant.name}.`
    );
  }

  const index =
    Number.isInteger(
      Number(
        restaurant.google_photo_index
      )
    )
      ? Number(
          restaurant.google_photo_index
        )
      : 0;

  const response = await fetch(
    `${SITE_URL}/api/place-photo?placeId=${encodeURIComponent(
      restaurant.google_place_id
    )}&index=${index}`,
    {
      cache: "no-store",
    }
  );

  const data =
    await response.json();

  if (
    !response.ok ||
    !data?.url
  ) {
    throw new Error(
      data?.error ||
        `Could not get photo for ${restaurant.name}.`
    );
  }

  return {
    sourceUrl:
      data.url,
    photoIndex:
      index,
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

  const data =
    await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error ||
        `Could not cache photo for ${restaurant.name}.`
    );
  }

  if (!data?.publicUrl) {
    throw new Error(
      `Cached photo URL missing for ${restaurant.name}.`
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

function buildCaption(
  config,
  restaurants
) {
  const parts = [
    config.intro,
    "",
    config.middle,
    "",
  ];

  restaurants.forEach(
    (restaurant) => {
      parts.push(
        restaurant.name
      );

      parts.push(
        restaurant.why_we_like_it ||
          ""
      );

      parts.push("");
    }
  );

  parts.push(config.outro);
  parts.push("");
  parts.push(
    config.hashtags
  );

  return parts.join("\n");
}

async function createQueueItem({
  config,
  restaurants,
  slideUrls,
}) {
  const caption =
    buildCaption(
      config,
      restaurants
    );

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/content_queue`,
    {
      method: "POST",

      headers:
        supabaseHeaders({
          Prefer:
            "return=representation",
        }),

      body: JSON.stringify({
        title:
          config.title,

        content_type:
          "carousel",

        topic:
          config.topic,

        caption,

        slide_text:
          restaurants.map(
            (
              restaurant,
              index
            ) => ({
              slide:
                index + 1,

              restaurant:
                restaurant.name,
            })
          ),

        media_urls:
          slideUrls,

        source_restaurant_ids:
          restaurants.map(
            (restaurant) =>
              restaurant.id
          ),

        salve_featured:
          restaurants.some(
            (restaurant) =>
              restaurant.id ===
              "R001"
          ),

        status:
          "ready_for_review",

        generation_notes:
          "Generated automatically by the generic Feed Me Budapest content generator.",
      }),
    }
  );

  const data =
    await response.json();

  if (!response.ok) {
    throw new Error(
      data?.message ||
        data?.error ||
        "Could not create Pending content."
    );
  }

  return data?.[0] || null;
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
            "Supabase configuration missing.",
        },
        {
          status: 500,
        }
      );
    }

    const body =
      await request.json();

    const adminKey =
      body?.adminKey || "";

    const topic =
      body?.topic ||
      "coffee";

    if (
      !isAuthorized(adminKey)
    ) {
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

    const config =
      TOPICS[topic];

    if (!config) {
      return Response.json(
        {
          ok: false,
          error:
            "Unsupported topic.",
        },
        {
          status: 400,
        }
      );
    }

    const restaurants =
      await loadRestaurants(
        config.restaurantIds
      );

    const slideUrls = [];

    for (
      const restaurant of
      restaurants
    ) {
      const {
        sourceUrl,
        photoIndex,
      } =
        await getPlacePhoto(
          restaurant
        );

      const cachedPhotoUrl =
        await cachePhoto(
          restaurant,
          sourceUrl,
          photoIndex
        );

      const slideUrl =
        await buildSlide(
          restaurant.id,
          cachedPhotoUrl
        );

      slideUrls.push(
        slideUrl
      );
    }

    const queueItem =
      await createQueueItem({
        config,
        restaurants,
        slideUrls,
      });

    return Response.json({
      ok: true,

      topic,

      title:
        config.title,

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
