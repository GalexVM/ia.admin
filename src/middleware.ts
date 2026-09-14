import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const AUTH_COOKIE_NAME = "admin_token";
const JWT_SECRET = process.env.JWT_SECRET || "zefiron_admin_ia_jwt_super_secret_key_2026_x99";
const secretKey = new TextEncoder().encode(JWT_SECRET);

async function isAuthenticated(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload.role === "admin";
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isAuth = await isAuthenticated(req);

  // Proteger rutas de Dashboard y API administrativa
  const isProtectedPath = pathname.startsWith("/dashboard") || pathname.startsWith("/api/admin");

  if (isProtectedPath && !isAuth) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Si ya está autenticado y va a /login, redirigir al Dashboard
  if (pathname === "/login" && isAuth) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/admin/:path*",
    "/login",
  ],
};
