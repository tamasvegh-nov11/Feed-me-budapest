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

function text(value) {
  return value || "";
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
        {
          error: "restaurantId is required.",
        },
        { status: 400 }
      );
    }

    if (!photoUrl) {
      return Response.json(
        {
          error: "photoUrl is required.",
        },
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
            position: "relative",
            overflow: "hidden",
            background: "#073b2d",
            fontFamily: "Arial",
          }}
        >
          {/* PHOTO */}
          <img
            src={photoUrl}
            width="1080"
            height="790"
            style={{
              width: "1080px",
              height: "790px",
              objectFit: "cover",
            }}
          />

          {/* DARK GRADIENT OVER PHOTO */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "1080px",
              height: "790px",
              display: "flex",
              background:
                "linear-gradient(180deg, rgba(7,59,45,0.05) 35%, rgba(7,59,45,0.88) 100%)",
            }}
          />

          {/* BRAND */}
          <div
            style={{
              position: "absolute",
              top: 48,
              left: 58,
              display: "flex",
              background: "#f7f3e8",
              color: "#073b2d",
              padding: "13px 20px",
              borderRadius: 30,
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: 3,
            }}
          >
            FEED ME BUDAPEST
          </div>

          {/* RESTAURANT NAME */}
          <div
            style={{
              position: "absolute",
              left: 58,
              bottom: 590,
              width: "900px",
              display: "flex",
              flexDirection: "column",
              color: "#f7f3e8",
            }}
          >
            <div
              style={{
                fontSize: 67,
                fontWeight: 700,
                lineHeight: 1,
              }}
            >
              {text(restaurant.name)}
            </div>

            {restaurant.primary_area && (
              <div
                style={{
                  marginTop: 18,
                  fontSize: 25,
                  opacity: 0.9,
                }}
              >
                {restaurant.primary_area} · Budapest
              </div>
            )}
          </div>

          {/* BOTTOM PANEL */}
          <div
            style={{
              height: "560px",
              width: "1080px",
              background: "#f7f3e8",
              color: "#073b2d",
              display: "flex",
              flexDirection: "column",
              padding: "52px 58px",
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: 40,
                width: "100%",
              }}
            >
              {/* WHY */}
              <div
                style={{
                  width: "60%",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div
                  style={{
                    fontSize: 19,
                    fontWeight: 700,
                    letterSpacing: 3,
                    marginBottom: 16,
                  }}
                >
                  WHY WE LIKE IT
                </div>

                <div
                  style={{
                    fontSize: 35,
                    lineHeight: 1.25,
                  }}
                >
                  {text(
                    restaurant.why_we_like_it
                  )}
                </div>
              </div>

              {/* DIVIDER */}
              <div
                style={{
                  width: "2px",
                  background: "#d7d0c1",
                  minHeight: "310px",
                  display: "flex",
                }}
              />

              {/* GOOD TO KNOW */}
              <div
                style={{
                  width: "34%",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div
                  style={{
                    fontSize: 19,
                    fontWeight: 700,
                    letterSpacing: 3,
                    marginBottom: 16,
                  }}
                >
                  GOOD TO KNOW
                </div>

                <div
                  style={{
                    fontSize: 28,
                    lineHeight: 1.3,
                  }}
                >
                  {text(
                    restaurant.good_to_know
                  )}
                </div>
              </div>
            </div>

            {/* FOOTER */}
            <div
              style={{
                marginTop: "auto",
                paddingTop: 26,
                borderTop:
                  "2px solid #d7d0c1",
                width: "100%",
                display: "flex",
                justifyContent:
                  "space-between",
                fontSize: 19,
              }}
            >
              <div>
                Independent Budapest food guide
              </div>

              <div
                style={{
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
