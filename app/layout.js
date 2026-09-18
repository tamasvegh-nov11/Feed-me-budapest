import "./globals.css";

export const metadata = {
  title: "Feed Me Budapest",
  description:
    "Curated food recommendations near Budapest's top sights.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
