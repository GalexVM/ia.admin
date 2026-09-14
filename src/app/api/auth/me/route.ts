import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAdminToken, AUTH_COOKIE_NAME } from "@/lib/auth";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const isValid = await verifyAdminToken(token);
  return NextResponse.json({ authenticated: isValid }, { status: isValid ? 200 : 401 });
}
