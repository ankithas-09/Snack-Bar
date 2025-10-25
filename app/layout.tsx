import "./globals.css"; // ✅ make sure styles load

export const metadata = {
  title: "Snack Bar",
  description: "Fresh, fast, and delicious."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div
            className="container"
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}
          >
            <div className="brand" aria-label="Snack Bar brand">
              <div className="brand-mark" />
              <span>Snack Bar</span>
            </div>

            {/* Top-right logo */}
            <a href="/" aria-label="Home">
              <img
                src="/logo.jpg"
                alt="Snack Bar logo"
                className="site-logo"
                width={44}
                height={44}
              />
            </a>
          </div>
        </header>

        <main className="container">{children}</main>

        <footer className="container">© {new Date().getFullYear()} Snack Bar</footer>
      </body>
    </html>
  );
}
