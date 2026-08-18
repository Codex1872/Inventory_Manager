import { Router, type IRouter } from "express";
import healthRouter     from "./health";
import dashboardRouter  from "./dashboard";
import productsRouter   from "./products";
import categoriesRouter from "./categories";
import suppliersRouter  from "./suppliers";
import locationsRouter  from "./locations";
import stockRouter      from "./stock";
import movementsRouter  from "./movements";
import ordersRouter     from "./orders";
import ticketsRouter    from "./tickets";
import printersRouter   from "./printers";
import bannersRouter    from "./banners";
import socialRouter     from "./social";
import storefrontRouter from "./storefront";
import posRouter        from "./pos";
import authRouter       from "./auth";
import cartRouter       from "./cart";
import checkoutRouter   from "./checkout";
import adminUsersRouter from "./adminUsers";
import uploadRouter     from "./upload";

const router: IRouter = Router();

for (const r of [
  healthRouter, dashboardRouter, productsRouter, categoriesRouter,
  suppliersRouter, locationsRouter, stockRouter, movementsRouter,
  ordersRouter, ticketsRouter, printersRouter, bannersRouter,
  socialRouter, storefrontRouter, posRouter,
  authRouter, cartRouter, checkoutRouter, adminUsersRouter,
  uploadRouter,
]) {
  router.use(r);
}

export default router;
