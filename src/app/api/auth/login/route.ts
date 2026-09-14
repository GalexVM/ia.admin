import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { signAdminToken, validateMasterPassword, AUTH_COOKIE_NAME, COOKIE_MAX_AGE } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { password } = body;

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { error: "La contraseña es obligatoria" },
        { status: 400 }
      );
    }

    const isValid = validateMasterPassword(password);
    if (!isValid) {
      return NextResponse.json(
        { error: "Contraseña maestra incorrecta" },
        { status: 401 }
      );
    }

    const token = await signAdminToken();
    const cookieStore = await cookies();

    cookieStore.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });

    return NextResponse.json({
      success: true,
      message: "Autenticación exitosa",
    });
  } catch (error) {
    console.error("Error en login:", error);
    return NextResponse.json(
      { error: "Error interno en el servidor de autenticación" },
      { status: 500 }
    );
  }
}
