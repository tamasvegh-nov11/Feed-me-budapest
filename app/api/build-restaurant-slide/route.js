import { ImageResponse } from "next/og";

export const runtime = "edge";

const SUPABASE_URL = process.env.SUPABASE_URL?.trim();
const SUPABASE_SECRET_KEY =
  process.env.SUPABASE_SECRET_KEY?.trim();

async function getRestaurant(id) {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/feed_restaurants?id=eq.${encodeURIComponent(
      id
    )}&select=id,name,why_we_like_it,good_to_know,primary_area`,
    {
      headers: {
        apikey: SUPABASE_SECRET_KEY,
      },
      cache: "no-store",
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.message || "Could not load restaurant."
    );
  }

  if (!data?.[0]) {
    throw new Error("Restaurant not found.");
  }

  return data[0];
}

function firstSentence(value = "") {
  const text = String(value).trim();

  if (!text) return "";

  const match = text.match(/^.*?[.!?](?:\s|$)/);

  return match
    ? match[0].trim()
    : text;
}

export async function POST(request) {
  try {
    const body = await request.json();

    const restaurantId =
      body?.restaurantId?.trim();

    const photoUrl =
      body?.photoUrl?.trim();

    if (!restaurantId) {
      return Response.json(
        { error: "restaurantId is required." },
        { status: 400 }
      );
    }

    if (!photoUrl) {
      return Response.json(
        { error: "photoUrl is required." },
        { status: 400 }
      );
    }

    const restaurant =
      await getRestaurant(restaurantId);

    const why =
      firstSentence(
        restaurant.why_we_like_it
      );

    const goodToKnow =
      firstSentence(
        restaurant.good_to_know
      );

    return new ImageResponse(
      (
        <div
          style={{
            width: "1080px",
            height: "1350px",
            display: "flex",
            flexDirection: "column",
            position: "relative",
            overflow: "hidden",
            background: "#073b2d",
            color: "#f7f3e8",
            fontFamily: "Arial",
          }}
        >
          {/* FULL HERO PHOTO */}
          <img
            src={photoUrl}
            width="1080"
            height="1000"
            style={{
              width: "1080px",
              height: "1000px",
              objectFit: "cover",
            }}
          />

          {/* DARK PHOTO GRADIENT */}
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: "1080px",
              height: "1000px",
              display: "flex",
              background:
                "linear-gradient(180deg, rgba(7,59,45,0.02) 35%, rgba(7,59,45,0.18) 58%, rgba(7,59,45,0.94) 100%)",
            }}
          />

          {/* BRAND BADGE */}
          <div
            style={{
              position: "absolute",
              top: 44,
              left: 48,
              display: "flex",
              padding: "12px 18px",
              background: "#f7f3e8",
              color: "#073b2d",
              borderRadius: 30,
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: 3,
            }}
          >
            FEED ME BUDAPEST
          </div>

          {/* NUMBER / EDITORIAL LABEL */}
          <div
            style={{
              position: "absolute",
              top: 48,
              right: 48,
              display: "flex",
              fontSize: 18,
              letterSpacing: 2,
              fontWeight: 700,
              color: "#f7f3e8",
            }}
          >
            PIZZA GUIDE
          </div>

          {/* RESTAURANT TITLE */}
          <div
            style={{
              position: "absolute",
              left: 50,
              right: 50,
              top: 660,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                fontSize: 69,
                fontWeight: 700,
                lineHeight: 0.98,
                letterSpacing: -2,
                maxWidth: "930px",
                display: "flex",
              }}
            >
              {restaurant.name}
            </div>

            {restaurant.primary_area && (
              <div
                style={{
                  marginTop: 16,
                  fontSize: 24,
                  opacity: 0.92,
                  display: "flex",
                }}
              >
                {restaurant.primary_area} · Budapest
              </div>
            )}

            {/* WHY WE LIKE IT */}
            <div
              style={{
                marginTop: 28,
                maxWidth: "900px",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  fontSize: 17,
                  letterSpacing: 3,
                  fontWeight: 700,
                  marginBottom: 10,
                  display: "flex",
                }}
              >
                WHY WE LIKE IT
              </div>

              <div
                style={{
                  fontSize: 31,
                  lineHeight: 1.18,
                  fontWeight: 500,
                  display: "flex",
                }}
              >
                {why}
              </div>
            </div>
          </div>

          {/* BOTTOM EDITORIAL PANEL */}
          <div
            style={{
              width: "1080px",
              height: "350px",
              background: "#f7f3e8",
              color: "#073b2d",
              display: "flex",
              flexDirection: "column",
              padding: "38px 50px 34px",
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                width: "100%",
                gap: 30,
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  width: "72%",
                }}
              >
                <div
                  style={{
                    fontSize: 17,
                    fontWeight: 700,
                    letterSpacing: 3,
                    marginBottom: 12,
                    display: "flex",
                  }}
                >
                  GOOD TO KNOW
                </div>

                <div
                  style={{
                    fontSize: 26,
                    lineHeight: 1.28,
                    display: "flex",
                  }}
                >
                  {goodToKnow}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: "180px",
                  padding: "15px 20px",
                  border: "2px solid #073b2d",
                  borderRadius: 40,
                  fontSize: 17,
                  fontWeight: 700,
                  letterSpacing: 1,
                }}
              >
                SAVE THIS
              </div>
            </div>

            <div
              style={{
                marginTop: "auto",
                paddingTop: 22,
                borderTop: "2px solid #d7d0c1",
                width: "100%",
                display: "flex",
                justifyContent: "space-between",
                fontSize: 17,
              }}
            >
              <div
                style={{
                  display: "flex",
                  opacity: 0.75,
                }}
              >
                Independent Budapest food guide
              </div>

              <div
                style={{
                  display: "flex",
                  fontWeight: 700,
                }}
              >
                feedme-budapest.com
              </div>
            </div>
          </div>
        </div>
      ),
      {
        width: 1080,
        height: 1350,
      }
    );
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      { status: 500 }
    );
  }
}
