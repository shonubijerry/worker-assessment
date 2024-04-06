import { OpenAPIRoute, Path, Body, Header, Str } from "@cloudflare/itty-router-openapi";
import jwt from '@tsndr/cloudflare-worker-jwt'

const users: Record<string, User> = {};

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
  address: String
};

function validateCredentials(username: string, password: string): boolean {
  return users[username]?.password === password;
}

function generateToken(user: User, context: any): Promise<string> {
  console.log(context);
  
  return jwt.sign({ username: user.username }, context.env.JWT_SECRET);
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

    if (!validateCredentials(username, password)) {
      return new Response("Invalid credentials", { status: 401 });
    }

    const token = await generateToken(users[username], context);

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
    env: any,
    context: any,
    data: Record<string, any>
  ) {
    console.log(env, context);
    
    const { username, email, password } = data.body;

    if (!username || !email || !password) {
      return new Response("Missing username, email, or password", { status: 400 });
    }

    if (users[username]) {
      return new Response("Username already exists", { status: 409 });
    }

    users[username] = { ...data.body };

    const token = await generateToken(users[username], context);
    return new Response("Registration successful", { status: 201 });
  }
}

export class Profile extends OpenAPIRoute {
  static schema = {
    tags: ["Auth"],
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

    const user = users[(<User>payload).username]

    if (!user) {
      return new Response("Invalid user", { status: 401 });
    }

    return { ...user, password: undefined };
  }
}
