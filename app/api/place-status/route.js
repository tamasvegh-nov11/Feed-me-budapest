export const dynamic = "force-dynamic";

const ONE_DAY_SECONDS = 60 * 60 * 24;
const MINUTES_IN_DAY = 24 * 60;
const MINUTES_IN_WEEK = 7 * MINUTES_IN_DAY;

function getBudapestNow() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Budapest",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value])
  );

  const dayMap = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return {
    day: dayMap[values.weekday],
    hour: Number(values.hour),
    minute: Number(values.minute),
  };
}

function pointToWeekMinutes(point) {
  if (!point || point.day === undefined || point.hour === undefined) {
    return null;
  }

  return (
    Number(point.day) * MINUTES_IN_DAY +
    Number(point.hour) * 60 +
    Number(point.minute || 0)
  );
}

function getCurrentWeekMinute() {
  const now = getBudapestNow();

  return (
    now.day * MINUTES_IN_DAY +
    now.hour * 60 +
    now.minute
  );
}

function normalizePeriods(periods = []) {
  const intervals = [];

  for (const period of periods) {
    const openMinute = pointToWeekMinutes(period?.open);

    if (openMinute === null) {
      continue;
    }

    /*
      Google may omit "close" for a continuously open business.
      In that case we treat it as open all week.
    */
    if (!period?.close) {
      intervals.push({
        open: 0,
        close: MINUTES_IN_WEEK,
      });

      continue;
    }

    let closeMinute = pointToWeekMinutes(period.close);

    if (closeMinute === null) {
      continue;
    }

    /*
      Example:
      Saturday 18:00 → Sunday 02:00

      Sunday is numerically earlier in the Google week,
      so move the closing point into the following week.
    */
    if (closeMinute <= openMinute) {
      closeMinute += MINUTES_IN_WEEK;
    }

    intervals.push({
      open: openMinute,
      close: closeMinute,
    });
  }

  return intervals;
}

function evaluateStatus(place) {
  if (
    place?.businessStatus &&
    place.businessStatus !== "OPERATIONAL"
  ) {
    return {
      recommendable: false,
      status: "closed",
      label: null,
      minutesToChange: null,
    };
  }

  const openingHours =
    place?.currentOpeningHours ||
    place?.regularOpeningHours ||
    null;

  if (!openingHours) {
    /*
      If Google has no opening-hours data, we do not automatically
      exclude the restaurant. Better to keep it than create a false
      "closed" result.
    */
    return {
      recommendable: true,
      status: "unknown",
      label: null,
      minutesToChange: null,
    };
  }

  const intervals = normalizePeriods(openingHours.periods || []);

  if (!intervals.length) {
    return {
      recommendable: true,
      status: "unknown",
      label: null,
      minutesToChange: null,
    };
  }

  const now = getCurrentWeekMinute();

  /*
    We check the current week and a shifted copy of it.
    This correctly handles periods crossing Sunday/Monday.
  */
  const expandedIntervals = [
    ...intervals,
    ...intervals.map((interval) => ({
      open: interval.open + MINUTES_IN_WEEK,
      close: interval.close + MINUTES_IN_WEEK,
    })),
  ];

  let currentInterval = null;

  for (const interval of expandedIntervals) {
    const adjustedNow =
      interval.open >= MINUTES_IN_WEEK
        ? now + MINUTES_IN_WEEK
        : now;

    if (
      adjustedNow >= interval.open &&
      adjustedNow < interval.close
    ) {
      currentInterval = {
        ...interval,
        now: adjustedNow,
      };

      break;
    }
  }

  /*
    OPEN NOW
  */
  if (currentInterval) {
    const minutesUntilClose =
      currentInterval.close - currentInterval.now;

    if (minutesUntilClose <= 30) {
      return {
        recommendable: true,
        status: "closing_soon",
        label: "Closing soon",
        minutesToChange: minutesUntilClose,
      };
    }

    return {
      recommendable: true,
      status: "open",
      label: null,
      minutesToChange: minutesUntilClose,
    };
  }

  /*
    CLOSED NOW:
    find the next opening time.
  */
  let minutesUntilOpen = null;

  for (const interval of expandedIntervals) {
    let candidateOpen = interval.open;

    if (candidateOpen < now) {
      candidateOpen += MINUTES_IN_WEEK;
    }

    const difference = candidateOpen - now;

    if (
      difference >= 0 &&
      (minutesUntilOpen === null ||
        difference < minutesUntilOpen)
    ) {
      minutesUntilOpen = difference;
    }
  }

  if (
    minutesUntilOpen !== null &&
    minutesUntilOpen <= 30
  ) {
    return {
      recommendable: true,
      status: "opening_soon",
      label: "Opening soon",
      minutesToChange: minutesUntilOpen,
    };
  }

  return {
    recommendable: false,
    status: "closed",
    label: null,
    minutesToChange: minutesUntilOpen,
  };
}

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
        revalidate: ONE_DAY_SECONDS,
      },
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
    `https://places.googleapis.com/v1/places/${encodeURIComponent(
      placeId
    )}`,
    {
      headers: {
        "X-Goog-Api-Key": apiKey,

        /*
          openNow deliberately NOT requested.
          We calculate the current state ourselves.
        */
        "X-Goog-FieldMask":
          "id,displayName,currentOpeningHours,regularOpeningHours,businessStatus",
      },
      next: {
        revalidate: ONE_DAY_SECONDS,
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

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    return Response.json(
      {
        error: "Google Places API key missing",
      },
      {
        status: 500,
      }
    );
  }

  let placeId = placeIdFromQuery;

  if (!placeId && name) {
    placeId = await findPlaceIdByName(name, apiKey);
  }

  if (!placeId) {
    return Response.json({
      recommendable: true,
      status: "unknown",
      label: null,
      minutesToChange: null,
      placeId: null,
    });
  }

  try {
    const place = await getPlaceDetails(placeId, apiKey);

    if (!place) {
      return Response.json({
        recommendable: true,
        status: "unknown",
        label: null,
        minutesToChange: null,
        placeId,
      });
    }

    const result = evaluateStatus(place);

    return Response.json({
      ...result,
      placeId,
    });
  } catch (error) {
    console.error("place-status error:", error);

    return Response.json({
      recommendable: true,
      status: "unknown",
      label: null,
      minutesToChange: null,
      placeId,
    });
  }
}
