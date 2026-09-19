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

    return new ImageResponse(
      (
        <div
          style={{
            width: "1080px",
            height: "1350px",
            display: "flex",
            flexDirection: "column",
            background: "#f7f3e8",
            color: "#073b2d",
            fontFamily: "Arial",
          }}
        >
          <div
            style={{
              position: "relative",
              width: "1080px",
              height: "760px",
              display: "flex",
            }}
          >
            <img
              src={photoUrl}
              width="1080"
              height="760"
              style={{
                width: "1080px",
                height: "760px",
                objectFit: "cover",
              }}
            />

            <div
              style={{
                position: "absolute",
                top: 40,
                left: 48,
                background: "#f7f3e8",
                color: "#073b2d",
                padding: "12px 18px",
                borderRadius: 28,
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: 3,
                display: "flex",
              }}
            >
              FEED ME BUDAPEST
            </div>

            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                height: "240px",
                background:
                  "linear-gradient(180deg, rgba(7,59,45,0) 0%, rgba(7,59,45,0.92) 100%)",
                display: "flex",
              }}
            />

            <div
              style={{
                position: "absolute",
                left: 48,
                right: 48,
                bottom: 44,
                display: "flex",
                flexDirection: "column",
                color: "#f7f3e8",
              }}
            >
              <div
                style={{
                  fontSize: 58,
                  fontWeight: 700,
                  lineHeight: 1.02,
                  display: "flex",
                }}
              >
                {restaurant.name}
              </div>

              {restaurant.primary_area && (
                <div
                  style={{
                    marginTop: 12,
                    fontSize: 24,
                    display: "flex",
                  }}
                >
                  {restaurant.primary_area} · Budapest
                </div>
              )}
            </div>
          </div>

          <div
            style={{
              width: "1080px",
              height: "590px",
              padding: "46px 52px 40px",
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              background: "#f7f3e8",
            }}
          >
            <div
              style={{
                display: "flex",
                width: "100%",
                gap: 34,
              }}
            >
              <div
                style={{
                  width: "60%",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    letterSpacing: 3,
                    marginBottom: 14,
                    display: "flex",
                  }}
                >
                  WHY WE LIKE IT
                </div>

                <div
                  style={{
                    fontSize: 32,
                    lineHeight: 1.25,
                    display: "flex",
                  }}
                >
                  {restaurant.why_we_like_it}
                </div>
              </div>

              <div
                style={{
                  width: "2px",
                  minHeight: "280px",
                  background: "#d8d2c4",
                  display: "flex",
                }}
              />

              <div
                style={{
                  width: "34%",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    letterSpacing: 3,
                    marginBottom: 14,
                    display: "flex",
                  }}
                >
                  GOOD TO KNOW
                </div>

                <div
                  style={{
                    fontSize: 25,
                    lineHeight: 1.3,
                    display: "flex",
                  }}
                >
                  {restaurant.good_to_know}
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: "auto",
                borderTop: "2px solid #d8d2c4",
                paddingTop: 22,
                display: "flex",
                justifyContent: "space-between",
                fontSize: 18,
                width: "100%",
              }}
            >
              <div style={{ display: "flex" }}>
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
