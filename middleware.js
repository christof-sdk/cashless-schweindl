export const config = { matcher: ["/((?!_vercel|favicon.ico|assets/).*)"] };

export default function middleware(request) {
  const auth = request.headers.get("Authorization");

  if (auth) {
    const [scheme, encoded] = auth.split(" ");
    if (scheme === "Basic" && encoded) {
      const decoded = atob(encoded);
      const [, password] = decoded.split(":");
      if (password === process.env.PREVIEW_PASSWORD) {
        const url = new URL(request.url);
        if (url.pathname === "/") {
          url.pathname = "/jar/49006b6473/pay";
          return Response.redirect(url, 307);
        }
        return;
      }
    }
  }

  return new Response("Zugang geschützt", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Cashless Schweindl"',
    },
  });
}
