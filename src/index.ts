import { Hono } from "hono";
import { prisma } from "./libs/prisma.js";
import { cors } from "hono/cors";

const app = new Hono();

app.use("/*", cors());

app.get("/", (c) => {
  return c.json({
    message: "This is lolicomputer's API",
    products: "/products",
  });
});

app.get("/products", async (c) => {
  const products = await prisma.product.findMany();

  return c.json(products);
});

app.post("/products/seed", async (c) => {
  await prisma.product.createMany({
    data: [
      {
        name: "Gigabyte GeForce RTX 4060 8GB GDDR6 OC Low Profile",
        description: "A powerful graphics card for gaming and rendering",
        price: 6000000,
      },
      {
        name: "Noctua NH-L9i-17XX Low-Profile CPU Cooler",
        description: "A low-profile CPU cooler for small form factor PCs",
        price: 828000,
      },
      {
        name: "Casing Fractal Design Ridge Black Mini ITX",
        description: "A compact and stylish case for mini ITX builds",
        price: 2500000,
      },
      {
        name: "PNY XLR8 DDR4 PC25600 3200MHz 32GB (2x16GB) Low Profile",
        description: "A high-performance RAM kit for gaming and productivity",
        price: 1300000,
      },
      {
        name: "ASROCK DESKMEET X300 + RYZEN 7 5700G + WIFI+BT",
        description: "A powerful mini PC for gaming and productivity",
        price: 6000000,
      },
    ],
  });

  return c.json({ message: "Products have been seeded" });
});

export default app;
