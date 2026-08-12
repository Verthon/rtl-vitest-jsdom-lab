---
title: Picking a Mode
order: 1
---

# Picking a Mode

React Router is a multi-strategy router for React. There are three primary ways, or "modes", to use it in your app. Across the docs you'll see these icons indicating which mode the content is relevant to:

[MODES: framework, data, declarative]

<p></p>

The features available in each mode are additive, so moving from Declarative to Data to Framework simply adds more features at the cost of architectural control. So pick your mode based on how much control or how much help you want from React Router.

The mode depends on which "top level" router API you're using:

## Declarative

Declarative mode enables basic routing features like matching URLs to components, navigating around the app, and providing active states with APIs like `<Link>`, `useNavigate`, and `useLocation`.

```tsx
import { BrowserRouter } from "react-router";

ReactDOM.createRoot(root).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
);
```

## Data

By moving route configuration outside of React rendering, Data Mode adds data loading, actions, pending states and more with APIs like `loader`, `action`, and `useFetcher`.

```tsx
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router";

let router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    loader: loadRootData,
  },
]);

ReactDOM.createRoot(root).render(
  <RouterProvider router={router} />,
);
```

## Framework

Framework Mode wraps Data Mode with a Vite plugin to add the full React Router experience with:

- type-safe `href`
- type-safe Route Module API
- intelligent code splitting
- SPA, SSR, and static rendering strategies
- and more

```ts filename=routes.ts
import { index, route } from "@react-router/dev/routes";

export default [
  index("./home.tsx"),
  route("products/:pid", "./product.tsx"),
];
```

You'll then have access to the Route Module API with type-safe params, loaderData, code splitting, SPA/SSR/SSG strategies, and more.

```ts filename=product.tsx
import { Route } from "./+types/product.tsx";

export async function loader({ params }: Route.LoaderArgs) {
  let product = await getProduct(params.pid);
  return { product };
}

export default function Product({
  loaderData,
}: Route.ComponentProps) {
  return <div>{loaderData.product.name}</div>;
}
```

## Decision Advice

Every mode supports any architecture and deployment target, so the question isn't really about if you want SSR, SPA, etc. It's about how much you want to do yourself.

**Use Framework Mode if you:**

- are too new to have an opinion
- are considering Next.js, Solid Start, SvelteKit, Astro, TanStack Start, etc. and want to compare
- just want to build something with React
- might want to server render, might not
- are migrating from Next.js

[→ Get Started with Framework Mode](./framework/installation).

**Use Data Mode if you:**

- want data features but also want to have control over bundling, data, and server abstractions
- started a data router in v6.4 and are happy with it

[→ Get Started with Data Mode](./data/custom).

**Use Declarative Mode if you:**

- want to use React Router as simply as possible
- are coming from earlier React Router versions and are happy with the `<BrowserRouter>`
- have a data layer that either skips pending states (like local first, background data replication/sync) or has its own abstractions for them
- are coming from Create React App (you may want to consider framework mode though)

[→ Get Started with Declarative Mode](./declarative/installation).

## API + Mode Availability Table

This is mostly for the LLMs, but knock yourself out:

| API                            | Framework | Data | Declarative |
| ------------------------------ | --------- | ---- | ----------- |
| Await                          | ✅        | ✅   |             |
| Form                           | ✅        | ✅   |
| Link                           | ✅        | ✅   | ✅          |
| `<Link discover>`              | ✅        |      |             |
| `<Link prefetch>`              | ✅        |      |             |
| `<Link preventScrollReset>`    | ✅        | ✅   |             |
| Links                          | ✅        |      |             |
| Meta                           | ✅        |      |             |
| NavLink                        | ✅        | ✅   | ✅          |
| `<NavLink discover>`           | ✅        |      |             |
| `<NavLink prefetch>`           | ✅        |      |             |
| `<NavLink preventScrollReset>` | ✅        | ✅   |             |
| NavLink `isPending`            | ✅        | ✅   |             |
| Navigate                       | ✅        | ✅   | ✅          |
| Outlet                         | ✅        | ✅   | ✅          |
| PrefetchPageLinks              | ✅        |      |             |
| Route                          | ✅        | ✅   | ✅          |
| Routes                         | ✅        | ✅   | ✅          |
| Scripts                        | ✅        |      |             |
| ScrollRestoration              | ✅        | ✅   |             |
| ServerRouter                   | ✅        |      |             |
| usePrompt                      | ✅        | ✅   |             |
| useActionData                  | ✅        | ✅   |             |
| useAsyncError                  | ✅        | ✅   |             |
| useAsyncValue                  | ✅        | ✅   |             |
| useBeforeUnload                | ✅        | ✅   | ✅          |
| useBlocker                     | ✅        | ✅   |             |
| useFetcher                     | ✅        | ✅   |             |
| useFetchers                    | ✅        | ✅   |             |
| useFormAction                  | ✅        | ✅   |             |
| useHref                        | ✅        | ✅   | ✅          |
| useInRouterContext             | ✅        | ✅   | ✅          |
| useLinkClickHandler            | ✅        | ✅   | ✅          |
| useLoaderData                  | ✅        | ✅   |             |
| useLocation                    | ✅        | ✅   | ✅          |
| useMatch                       | ✅        | ✅   | ✅          |
| useMatches                     | ✅        | ✅   |             |
| useNavigate                    | ✅        | ✅   | ✅          |
| useNavigation                  | ✅        | ✅   |             |
| useNavigationType              | ✅        | ✅   | ✅          |
| useOutlet                      | ✅        | ✅   | ✅          |
| useOutletContext               | ✅        | ✅   | ✅          |
| useParams                      | ✅        | ✅   | ✅          |
| useResolvedPath                | ✅        | ✅   | ✅          |
| useRevalidator                 | ✅        | ✅   |             |
| useRouteError                  | ✅        | ✅   |             |
| useRouteLoaderData             | ✅        | ✅   |             |
| useRoutes                      | ✅        | ✅   | ✅          |
| useSearchParams                | ✅        | ✅   | ✅          |
| useSubmit                      | ✅        | ✅   |             |
| useViewTransitionState         | ✅        | ✅   |             |
| isCookieFunction               | ✅        | ✅   |             |
| isSessionFunction              | ✅        | ✅   |             |
| createCookie                   | ✅        | ✅   |             |
| createCookieSessionStorage     | ✅        | ✅   |             |
| createMemorySessionStorage     | ✅        | ✅   |             |
| createPath                     | ✅        | ✅   | ✅          |
| createRoutesFromElements       |           | ✅   |             |
| createRoutesStub               | ✅        | ✅   |             |
| createSearchParams             | ✅        | ✅   | ✅          |
| data                           | ✅        | ✅   |             |
| generatePath                   | ✅        | ✅   | ✅          |
| href                           | ✅        |      |             |
| isCookie                       | ✅        | ✅   |             |
| isRouteErrorResponse           | ✅        | ✅   |             |
| isSession                      | ✅        | ✅   |             |
| matchPath                      | ✅        | ✅   | ✅          |
| matchRoutes                    | ✅        | ✅   | ✅          |
| parsePath                      | ✅        | ✅   | ✅          |
| redirect                       | ✅        | ✅   |             |
| redirectDocument               | ✅        | ✅   |             |
| renderMatches                  | ✅        | ✅   | ✅          |
| replace                        | ✅        | ✅   |             |
| resolvePath                    | ✅        | ✅   | ✅          |

---
title: Routing
order: 2
---

# Routing

[MODES: data]

## Configuring Routes

Routes are configured as the first argument to `createBrowserRouter`. At a minimum, you need a path and component:

```tsx
import { createBrowserRouter } from "react-router";

function Root() {
  return <h1>Hello world</h1>;
}

const router = createBrowserRouter([
  { path: "/", Component: Root },
]);
```

Here is a larger sample route config:

```ts filename=app/routes.ts
createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: Home },
      { path: "about", Component: About },
      {
        path: "auth",
        Component: AuthLayout,
        children: [
          { path: "login", Component: Login },
          { path: "register", Component: Register },
        ],
      },
      {
        path: "concerts",
        children: [
          { index: true, Component: ConcertsHome },
          { path: ":city", Component: ConcertsCity },
          { path: "trending", Component: ConcertsTrending },
        ],
      },
    ],
  },
]);
```

## Route Objects

Route objects define the behavior of a route beyond just the path and component, like data loading and actions. We'll go into more detail in the [Route Object guide](./route-object), but here's a quick example of a loader.

```tsx filename=app/team.tsx
import {
  createBrowserRouter,
  useLoaderData,
} from "react-router";

createBrowserRouter([
  {
    path: "/teams/:teamId",
    loader: async ({ params }) => {
      let team = await fetchTeam(params.teamId);
      return { name: team.name };
    },
    Component: Team,
  },
]);

function Team() {
  let data = useLoaderData();
  return <h1>{data.name}</h1>;
}
```

## Nested Routes

Routes can be nested inside parent routes through `children`.

```ts filename=app/routes.ts
createBrowserRouter([
  {
    path: "/dashboard",
    Component: Dashboard,
    children: [
      { index: true, Component: Home },
      { path: "settings", Component: Settings },
    ],
  },
]);
```

The path of the parent is automatically included in the child, so this config creates both `"/dashboard"` and `"/dashboard/settings"` URLs.

Child routes are rendered through the `<Outlet/>` in the parent route.

```tsx filename=app/dashboard.tsx
import { Outlet } from "react-router";

export default function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      {/* will either be <Home> or <Settings> */}
      <Outlet />
    </div>
  );
}
```

## Layout Routes

Omitting the `path` in a route creates new [Nested Routes](#nested-routes) for its children without adding any segments to the URL.

```tsx lines=[3,16]
createBrowserRouter([
  {
    // no path on this parent route, just the component
    Component: MarketingLayout,
    children: [
      { index: true, Component: Home },
      { path: "contact", Component: Contact },
    ],
  },

  {
    path: "projects",
    children: [
      { index: true, Component: ProjectsHome },
      {
        // again, no path, just a component for the layout
        Component: ProjectLayout,
        children: [
          { path: ":pid", Component: Project },
          { path: ":pid/edit", Component: EditProject },
        ],
      },
    ],
  },
]);
```

Note that:

- `Home` and `Contact` will be rendered into the `MarketingLayout` outlet
- `Project` and `EditProject` will be rendered into the `ProjectLayout` outlet while `ProjectsHome` will not.

## Index Routes

Index routes are defined by setting `index: true` on a route object without a path.

```ts
{ index: true, Component: Home }
```

Index routes render into their parent's [Outlet][outlet] at their parent's URL (like a default child route).

```ts lines=[4,5,10,11]
import { createBrowserRouter } from "react-router";

createBrowserRouter([
  // renders at "/"
  { index: true, Component: Home },
  {
    Component: Dashboard,
    path: "/dashboard",
    children: [
      // renders at "/dashboard"
      { index: true, Component: DashboardHome },
      { path: "settings", Component: DashboardSettings },
    ],
  },
]);
```

Note that index routes can't have children.

## Prefix Route

A route with just a path and no component creates a group of routes with a path prefix.

```tsx lines=[3]
createBrowserRouter([
  {
    // no component, just a path
    path: "/projects",
    children: [
      { index: true, Component: ProjectsHome },
      { path: ":pid", Component: Project },
      { path: ":pid/edit", Component: EditProject },
    ],
  },
]);
```

This creates the routes `/projects`, `/projects/:pid`, and `/projects/:pid/edit` without introducing a layout component.

## Dynamic Segments

If a path segment starts with `:` then it becomes a "dynamic segment". When the route matches the URL, the dynamic segment will be parsed from the URL and provided as `params` to other router APIs.

```ts lines=[2]
{
  path: "teams/:teamId",
  loader: async ({ params }) => {
    // params are available in loaders/actions
    let team = await fetchTeam(params.teamId);
    return { name: team.name };
  },
  Component: Team,
}
```

```tsx
import { useParams } from "react-router";

function Team() {
  // params are available in components through useParams
  let params = useParams();
  // ...
}
```

You can have multiple dynamic segments in one route path:

```ts
{
  path: "c/:categoryId/p/:productId";
}
```

## Optional Segments

You can make a route segment optional by adding a `?` to the end of the segment.

```ts
{
  path: ":lang?/categories";
}
```

You can have optional static segments, too:

```ts
{
  path: "users/:userId/edit?";
}
```

## Splats

Also known as "catchall" and "star" segments. If a route path pattern ends with `/*` then it will match any characters following the `/`, including other `/` characters.

```ts
{
  path: "files/*";
  loader: async ({ params }) => {
    params["*"]; // will contain the remaining URL after files/
  };
}
```

You can destructure the `*`, you just have to assign it a new name. A common name is `splat`:

```tsx
const { "*": splat } = params;
```

---

Next: [Route Object](./route-object)

[outlet]: https://api.reactrouter.com/v8/functions/react-router.Outlet.html
