import type { Config, Context } from "@netlify/functions";

const buildUpstreamUrl = (req: Request, apiUrl: string) => {
  const requestUrl = new URL(req.url);
  return new URL(`${requestUrl.pathname}${requestUrl.search}`, apiUrl);
};

export default async (req: Request, _context: Context) => {
  const apiUrl = Netlify.env.get("API_URL") ?? Netlify.env.get("VITE_API_URL");
  const token =
    Netlify.env.get("API_TOKEN") ?? Netlify.env.get("VITE_TOKEN") ?? "";

  if (!apiUrl) {
    return new Response("Missing API_URL configuration.", { status: 500 });
  }

  if (!token) {
    return new Response("Missing API_TOKEN configuration.", { status: 500 });
  }

  const upstreamUrl = buildUpstreamUrl(req, apiUrl);
  const method = req.method ?? "GET";
  const body =
    method === "GET" || method === "HEAD" ? undefined : await req.text();

  const upstreamResponse = await fetch(upstreamUrl, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": req.headers.get("content-type") ?? "application/json",
    },
    body,
  });

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    headers: upstreamResponse.headers,
  });
};

export const config: Config = {
  path: "/scheduler/appointments",
};
