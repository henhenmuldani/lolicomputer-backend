import { Hono } from "hono";
import { prisma } from "./libs/prisma.js";
import { cors } from "hono/cors";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { hashPassword, verifyPassword } from "./libs/password.js";
import { createToken } from "./libs/jwt.js";
import { checkUserToken } from "./middlewares/check-user-token.js";

type Bindings = {
  TOKEN: string;
};

type Variables = {
  user: {
    id: string;
  };
};

export type HonoApp = { Bindings: Bindings; Variables: Variables };

const app = new Hono<HonoApp>();

app.use("/*", cors());

app.get("/", (c) => {
  return c.json({
    message: "This is lolicomputer's API",
    products: "/products",
    users: "/users",
    auth: "/auth",
  });
});

app.get("/products", async (c) => {
  const products = await prisma.product.findMany();

  return c.json(products);
});

app.get(
  "/products/:slug",
  zValidator("param", z.object({ slug: z.string() })),
  async (c) => {
    const { slug } = c.req.valid("param");

    const product = await prisma.product.findUnique({
      where: {
        slug: slug,
      },
    });

    return c.json(product);
  }
);

app.get("/users", async (c) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
    },
  });

  return c.json(users);
});

app.get(
  "/users/:username",
  zValidator("param", z.object({ username: z.string() })),
  async (c) => {
    const { username } = c.req.valid("param");

    const user = await prisma.user.findUnique({
      where: {
        username: username,
      },
      select: {
        id: true,
        username: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return c.json({ message: "User not found" }, 404);
    }

    return c.json(user);
  }
);

app.post(
  "/auth/register",
  zValidator(
    "json",
    z.object({
      username: z.string(),
      email: z.string(),
      password: z.string(),
    })
  ),
  async (c) => {
    const body = c.req.valid("json");

    try {
      const newUser = await prisma.user.create({
        data: {
          username: body.username,
          email: body.email,
          password: {
            create: {
              hash: await hashPassword(body.password),
            },
          },
        },
      });

      return c.json({
        message: "Register new user successful",
        newUser: {
          username: newUser.username,
        },
      });
    } catch (error) {
      return c.json({ message: "Cannot register user" }, 400);
    }
  }
);

app.post(
  "/auth/login",
  zValidator(
    "json",
    z.object({
      email: z.string(),
      password: z.string(),
    })
  ),
  async (c) => {
    const body = c.req.valid("json");

    const foundUser = await prisma.user.findUnique({
      where: { email: body.email },
      include: { password: { select: { hash: true } } },
    });

    if (!foundUser) {
      return c.json({ message: "User not found" }, 404);
    }

    if (!foundUser?.password?.hash) {
      c.status(400);
      return c.json({
        message: "Cannot login because user doesn't have a password",
      });
    }

    const validPassword = await verifyPassword(
      foundUser.password.hash,
      body.password
    );

    if (!validPassword) {
      return c.json({ message: "Invalid password" }, 400);
    }

    const token = await createToken(foundUser.id);

    if (!token) {
      return c.json({ message: "Cannot create token" }, 400);
    }

    return c.json({
      message: "Login successful",
      token,
    });
  }
);

app.get("/auth/profile", checkUserToken(), async (c) => {
  const user = c.get("user");

  const userData = await prisma.user.findUnique({
    where: { id: user.id },
  });

  return c.json({
    message: "User data",
    user: userData,
  });
});

app.get("/cart", checkUserToken(), async (c) => {
  const user = c.get("user");

  const existingCart = await prisma.cart.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    // include: { items: { include: { product: true } } },
    select: {
      id: true,
      items: {
        include: {
          product: {
            omit: {
              description: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!existingCart) {
    const newCart = await prisma.cart.create({
      data: { userId: user.id },
      include: { items: { include: { product: true } } },
    });

    return c.json(newCart);
  }

  return c.json(existingCart);
});

app.post(
  "/items",
  checkUserToken(),
  zValidator(
    "json",
    z.object({
      productId: z.string(),
      quantity: z.number().min(1),
    })
  ),
  async (c) => {
    const user = c.get("user");
    const body = c.req.valid("json");

    const existingCart = await prisma.cart.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    if (!existingCart) {
      return c.json({ message: "Shopping cart is unavailable" }, 404);
    }

    const updatedCart = await prisma.cart.update({
      where: { id: existingCart.id },
      data: {
        items: {
          create: {
            productId: body.productId,
            quantity: body.quantity,
          },
        },
      },
      select: {
        items: {
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    return c.json(updatedCart);
  }
);

// app.post("/products/seed", async (c) => {
//   await prisma.product.createMany({
//     data: [
//       {
//         name: "Gigabyte GeForce RTX 4060 8GB GDDR6 OC Low Profile",
//         description: "A powerful graphics card for gaming and rendering",
//         price: 6000000,
//       },
//       {
//         name: "Noctua NH-L9i-17XX Low-Profile CPU Cooler",
//         description: "A low-profile CPU cooler for small form factor PCs",
//         price: 828000,
//       },
//       {
//         name: "Casing Fractal Design Ridge Black Mini ITX",
//         description: "A compact and stylish case for mini ITX builds",
//         price: 2500000,
//       },
//       {
//         name: "PNY XLR8 DDR4 PC25600 3200MHz 32GB (2x16GB) Low Profile",
//         description: "A high-performance RAM kit for gaming and productivity",
//         price: 1300000,
//       },
//       {
//         name: "ASROCK DESKMEET X300 + RYZEN 7 5700G + WIFI+BT",
//         description: "A powerful mini PC for gaming and productivity",
//         price: 6000000,
//       },
//     ],
//   });

//   return c.json({ message: "Products have been seeded" });
// });

export default app;
