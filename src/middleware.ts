import { withAuth } from "next-auth/middleware";

// Admin pages and write APIs require a session. Public reads stay open.
export default withAuth({
  pages: { signIn: "/admin/login" }
});

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"]
};
