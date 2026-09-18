export const dynamic = "force-dynamic";

function getBudapestNow() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Budapest",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    weekday: "short",
  }).formatToParts(new Date());

  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));

  return {
    weekday: map.weekday,
    date: `${map.year}-${map.month}-${map.day}`,
    hour: Number(map.hour),
    minute: Number(map.minute),
  };
}

function minutesFromHHMM(value) {
  if (!value) return null;

  const [h, m] = value.split(":").map(Number);

  if (!Number.isFinite(h) || !Number.isFinite(m)) {
    return null;
  }

  return h * 60 + m;
}

function weekdayIndex(shortName) {
  const order = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  };

  return order[shortName];
}

async function findPlaceIdByName(name, apiKey) {
  const response = await fetch(
    "https://places.googleapis.com/v1/places:searchText",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress",
      },
      body: JSON.stringify({
        textQuery: `${name}, Budapest, Hungary`,
        maxResultCount: 1,
      }),
      cache: "no-store",
    }
  );

  if (!response.ok) {
    return null;
  }

  const data = await response.json();

  return data?.places?.[0]?.id || null;
}

async function getPlaceDetails(placeId, apiKey) {
  const response = await fetch(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
    {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "id,displayName,currentOpeningHours,regularOpeningHours,businessStatus",
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    return null;
  }

  return response.json();
}

function evaluateStatus(place) {
  const now = getBudapestNow();
  const currentMinutes = now.hour * 60 + now.minute;

  const openingHours =
    place?.currentOpeningHours || place?.regularOpeningHours || null;

  if (!openingHours) {
    return {
      recommendable: true,
      status: "unknown",
      label: null,
      minutesToChange: null,
    };
  }

  if (place?.businessStatus && place.businessStatus !== "OPERATIONAL") {
    return {
      recommendable: false,
      status: "closed",
      label: null,
      minutesToChange: null,
    };
  }

  const isOpenNow = Boolean(openingHours.openNow);

  const periods = openingHours.periods || [];
  const todayIndex = weekdayIndex(now.weekday);

  const todaysPeriods = periods.filter((period) => {
    return (
      period?.open?.day === todayIndex ||
      period?.close?.day === todayIndex
    );
  });

  if (isOpenNow) {
    let closingMinutes = null;

    for (const period of todaysPeriods) {
      const close = period?.close;

      if (!close?.hour && close?.hour !== 0) continue;

      const value = close.hour * 60 + (close.minute || 0);

      if (value >= currentMinutes) {
        if (closingMinutes === null || value < closingMinutes) {
          closingMinutes = value;
        }
      }
    }

    if (
      closingMinutes !== null &&
      closingMinutes - currentMinutes <= 30
    ) {
      return {
        recommendable: true,
        status: "closing_soon",
        label: "Closing soon",
        minutesToChange: closingMinutes - currentMinutes,
      };
    }

    return {
      recommendable: true,
      status: "open",
      label: null,
      minutesToChange: null,
    };
  }

  let nextOpeningMinutes = null;

  for (const period of todaysPeriods) {
    const open = period?.open;

    if (!open?.hour && open?.hour !== 0) continue;

    const value = open.hour * 60 + (open.minute || 0);

    if (value >= currentMinutes) {
      if (
        nextOpeningMinutes === null ||
        value < nextOpeningMinutes
      ) {
        nextOpeningMinutes = value;
      }
    }
  }

  if (
    nextOpeningMinutes !== null &&
    nextOpeningMinutes - currentMinutes <= 30
  ) {
    return {
      recommendable: true,
      status: "opening_soon",
      label: "Opening soon",
      minutesToChange: nextOpeningMinutes - currentMinutes,
    };
  }

  return {
    recommendable: false,
    status: "closed",
    label: null,
    minutesToChange: null,
  };
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);

  const placeIdFromQuery = searchParams.get("placeId");
  const name = searchParams.get("name");

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
      {
        recommendable: true,
        status: "unknown",
        label: null,
        placeId: null,
      },
      { status: 200 }
    );
  }

  try {
    const place = await getPlaceDetails(placeId, apiKey);

    if (!place) {
      return Response.json(
        {
          recommendable: true,
          status: "unknown",
          label: null,
          placeId,
        },
        { status: 200 }
      );
    }

    const result = evaluateStatus(place);

    return Response.json({
      ...result,
      placeId,
    });
  } catch {
    return Response.json(
      {
        recommendable: true,
        status: "unknown",
        label: null,
        placeId,
      },
      { status: 200 }
    );
  }
}
