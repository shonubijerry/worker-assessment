import { OpenAPIRoute, Path, Body, Header, Str } from "@cloudflare/itty-router-openapi";
import jwt from '@tsndr/cloudflare-worker-jwt'
import { AvatarGenerator } from 'random-avatar-generator'

interface User {
  username: string;
  email: string;
  password: string
}

const LoginSchema = {
  username: new Str({ example: "lorem" }),
  password: new Str({ example: "password" }),
};

const UserSchema = {
  ...LoginSchema,
  email: new Str({ example: "lorem@mail.com" }),
  phone: new Str({ example: "09088009900" }),
  address: String,
  image: String
};

function validateCredentials(user: User, password: string): boolean {
  return user.password === password;
}

function generateToken(user: User, env: Env): Promise<string> {
  return jwt.sign({ username: user.username }, env.JWT_SECRET);
}

export class Login extends OpenAPIRoute {
  static schema = {
    tags: ["Auth"],
    summary: "Login to the API",
    requestBody: LoginSchema,
    responses: {
      '200': {
        schema: {
          token: String
        },
      },
    },
  };

  async handle(
    request: Request,
    env: Env,
    context: any,
    data: Record<string, any>
  ) {
    const { username, password } = data.body;
    if (!username || !password) {
      return new Response("Missing username or password", { status: 400 });
    }

    let entry = await env.STORAGE_KV.get(username)
    if (!entry) {
      return new Response("Missing username or password", { status: 400 });
    }

    const user = <User>JSON.parse(entry)

    if (!validateCredentials(user, password)) {
      return new Response("Invalid credentials", { status: 401 });
    }

    const token = await generateToken(user, env);

    return { token }
  }
}

export class Register extends OpenAPIRoute {
  static schema = {
    tags: ["Auth"],
    summary: "Register a new user",
    requestBody: UserSchema,
    responses: {
      '201': {
        schema: {
          ...UserSchema,
          token: String
        }
      },
    },
  };

  async handle(
    request: Request,
    env: Env,
    context: any,
    data: Record<string, any>
  ) {    
    const { username, email, password } = data.body;

    if (!username || !email || !password) {
      return new Response("Missing username, email, or password", { status: 400 });
    }

    if (await env.STORAGE_KV.get(username)) {
      return new Response("Username already exists", { status: 409 });
    }

    await env.STORAGE_KV.put(username, JSON.stringify({ ...data.body, image: new AvatarGenerator().generateRandomAvatar() }))

    return new Response("Registration successful", { status: 201 });
  }
}

export class Profile extends OpenAPIRoute {
  static schema = {
    tags: ["Me"],
    summary: "Fetch user profile",
    responses: {
      200: {
        schema: UserSchema
      },
    },
    security: [{ bearer: [] }]
  };

  async handle(
    request: Request,
    env: Env,
    context: any,
    data: Record<string, any>
  ) {
    const authorization = request.headers.get("Authorization");
    if (!authorization || !authorization.startsWith("Bearer ")) {
      return new Response("Unauthorized", { status: 401 });
    }

    const token = authorization.slice("Bearer ".length);

    const isValid = await jwt.verify(token, env.JWT_SECRET);

    if (!isValid) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { payload } = jwt.decode<User>(token)

    const user = await env.STORAGE_KV.get((<User>payload).username)

    if (!user) {
      return new Response("Invalid user", { status: 401 });
    }

    return { ...JSON.parse(user), password: undefined };
  }
}
