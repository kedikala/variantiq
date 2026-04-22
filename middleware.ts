import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const protectedRoutes = ["/dashboard", "/experiments"];
const VISITOR_COOKIE_NAME = "visitor_id";
const STORE_ROUTE_PREFIX = "/products/";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const VISITOR_HEADER_NAME = "x-visitor-id";
const VARIANT_HEADER_NAME = "x-assigned-variant";

function isProtectedRoute(pathname: string): boolean {
  return protectedRoutes.some(
    (routePrefix) => pathname === routePrefix || pathname.startsWith(`${routePrefix}/`)
  );
}

function setStoreCookies(
  request: NextRequest,
  requestHeaders: Headers,
  response: NextResponse
): void {
  if (!request.nextUrl.pathname.startsWith(STORE_ROUTE_PREFIX)) {
    return;
  }

  const productSlug = request.nextUrl.pathname.slice(STORE_ROUTE_PREFIX.length);
  const visitorId = request.cookies.get(VISITOR_COOKIE_NAME)?.value ?? crypto.randomUUID();
  const variantCookieName = `variant_${productSlug}`;
  const assignedVariant =
    request.cookies.get(variantCookieName)?.value ?? (Math.random() > 0.5 ? "control" : "treatment");

  requestHeaders.set(VISITOR_HEADER_NAME, visitorId);
  requestHeaders.set(VARIANT_HEADER_NAME, assignedVariant);

  if (!request.cookies.get(VISITOR_COOKIE_NAME)?.value) {
    response.cookies.set({
      name: VISITOR_COOKIE_NAME,
      value: visitorId,
      httpOnly: false,
      maxAge: COOKIE_MAX_AGE_SECONDS,
      path: "/",
      sameSite: "lax",
    });
  }

  if (!request.cookies.get(variantCookieName)?.value) {
    response.cookies.set({
      name: variantCookieName,
      value: assignedVariant,
      httpOnly: false,
      maxAge: COOKIE_MAX_AGE_SECONDS,
      path: "/",
      sameSite: "lax",
    });
  }
}

export async function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  setStoreCookies(request, requestHeaders, response);

  if (!isProtectedRoute(request.nextUrl.pathname)) {
    return response;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirectTo", request.nextUrl.pathname);

    return NextResponse.redirect(loginUrl);
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        response.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        response.cookies.set({ name, value: "", ...options });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    return response;
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.searchParams.set("redirectTo", request.nextUrl.pathname);

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/dashboard/:path*", "/experiments/:path*", "/products/:path*"],
};
