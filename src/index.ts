import { OpenAPIRouter } from "@cloudflare/itty-router-openapi";
import { Login, Profile, Register } from "./auth";

const router = OpenAPIRouter({
	schema: {
		info: {
			title: "Worker Assessment",
			version: "1.0",
		},
		components: {
			securitySchemes: {
				bearer: {
					scheme: "bearer",
					bearerFormat: "JWT",
					type: "http"
				}
			}
		}
	},
});

router.post("/api/login", Login);
router.post("/api/register", Register);
router.get("/api/tasks/profile", Profile);

// Redirect root request to the /docs page
router.original.get("/", (request) =>
	Response.redirect(`${request.url}docs`, 302)
);

// 404 for everything else
router.all("*", () => new Response("Not Found.", { status: 404 }));

export default {
	fetch: router.handle,
};
