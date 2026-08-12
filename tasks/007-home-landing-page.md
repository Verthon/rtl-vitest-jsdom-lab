# 007 — Replace the scaffold homepage with a landing page

Read `AGENTS.md` and `CONVENTIONS.md` first. Do only this task.

`src/home/HomePage.tsx` is still the stock Vite scaffold — counter button, React
and Vite logos, links to Discord and Bluesky. Replace it with a small landing
page that acts as the app's first screen: a heading and a grid of cards, one per
capability, starting with a single card linking to the employee directory.

**Independent of 005 and 006.** It touches only `src/home/`, `src/assets/`, and
`public/icons.svg`. It can run before, during, or after them without conflict.

Deliberately small. It is a starting point that later tasks append cards to, not
a finished dashboard.

## Decisions — settled. Do not substitute your own.

- **Card grid, not a hero or a link list.** One card per capability in a
  responsive grid. Adding the next capability must be appending one `<Card>`,
  with no layout rewrite.
- **Add the card component** with `npx shadcn@latest add card`. Do not hand-write
  it, and do not add anything else from the registry — `CONVENTIONS.md` treats an
  unused component as dead code.
- **Navigate with `Link` from `react-router`**, never a bare `<a href>`. An
  anchor triggers a full document reload, drops the SPA, and remounts the
  `QueryClient`. If you wrap it in a `Button`, use `asChild` so a real anchor is
  rendered — the test asserts on `role="link"` and its `href`.
- **Copy is fixed.** Use exactly these strings so the spec and the page cannot
  drift:
  - Page heading (`<h1>`): `Directory`
  - Subtitle: `Internal tools and records.`
  - Card title: `Employee Directory`
  - Card description: `Browse and filter the team roster.`
  - Link text: `Open directory`
- **One `<h1>` on the page.** The card title is an `<h2>`-level heading (whatever
  `CardTitle` renders — check it, and if it renders a `div`, that is fine; do not
  fight the component). Do not add a second `<h1>`.
- **No new state.** No `useState`, no data fetching, no `useQuery`. This page
  talks to nothing.
- **Tailwind utilities only**, consistent with `EmployeesPage`. Do not add rules
  to `src/styles/globals.css` and do not reintroduce the scaffold's `className`s
  (`hero`, `ticks`, `next-steps`, `counter`) — nothing styles them; they are
  dead strings.

## Steps

### 1. Add the card component

```bash
npx shadcn@latest add card
```

### 2. Scenario — the card links to the directory

Red first. New file `src/home/HomePage.spec.tsx`:

```tsx
it('links to the employee directory', () => {
  render(<HomePage />, { wrapper: TestAppProviders })

  expect(
    screen.getByRole('link', { name: /employee directory/i }),
  ).toHaveAttribute('href', '/employees')
})
```

`TestAppProviders` is required — `Link` throws outside a router context.

The accessible name comes from the card's link. If the visible link text is
`Open directory`, the name will not match `/employee directory/i`; either query
by the text that is actually there or make the whole card the link. Decide, then
make the query match reality — do not weaken the regex until something passes.

Add a second assertion for the heading:

```tsx
expect(screen.getByRole('heading', { level: 1, name: 'Directory' })).toBeInTheDocument()
```

Run both. They fail — the scaffold has no such link and no `<h1>Directory</h1>`.

### 3. Rewrite HomePage

Replace the entire body of `src/home/HomePage.tsx`. Nothing from the scaffold
survives — no counter, no logos, no external links, no `<use href="/icons.svg">`
sprites, no `id="center"` / `id="next-steps"` / `id="spacer"` sections.

Structure:

- `<h1>Directory</h1>` and the subtitle paragraph.
- A grid (`grid gap-4 sm:grid-cols-2 lg:grid-cols-3` or similar) holding one
  `<Card>`: title, description, and the `Link` to `/employees`.

Match `EmployeesPage`'s outer spacing (`<section className="p-4">`) so the two
pages do not look like they came from different apps.

Make step 2 green.

### 4. Delete the orphaned assets

`HomePage.tsx` was the only consumer of all four. Verified before this task was
written — re-verify with grep after your rewrite, then delete:

```
src/assets/hero.png
src/assets/react.svg
src/assets/vite.svg
public/icons.svg
```

`src/assets/` will be empty; remove the directory too.

**Keep `public/favicon.svg`** — `index.html` references it directly and knip does
not scan `public/`, so nothing else will catch its removal.

If grep shows any of these referenced from somewhere other than `HomePage.tsx`,
stop and report rather than deleting.

### 5. Mutation-check

Break it, confirm the named test reddens, revert.

| Mutation | Must redden |
|---|---|
| `Link to="/employees"` → `to="/employee"` | links to the employee directory |
| `Link` swapped for a plain `<div onClick>` | links to the employee directory (no `link` role) |
| `<h1>` demoted to `<h2>` | heading assertion |

The middle row is the one worth caring about: it is the regression where the card
still looks clickable and still navigates in a browser, but is invisible to
assistive tech and to a role query.

## Out of scope

- Any second card, nav bar, sidebar, layout route, or shared app shell. Later
  tasks add capabilities; this one establishes where they go.
- Auth, login, or a user menu — "first contact point when you log in" describes
  the page's role in the app, not a login feature.
- Restyling `EmployeesPage`.
- Dark mode, theming, animations.
- Touching `src/components/ui/` beyond the generated `card.tsx`.

## Done

All four commands pass:

```bash
npm run build && npm run test:unit && npm run lint && npm run scan:dead-code
```

`scan:dead-code` has a known dirty baseline (HANDOFF open item 3: `dialog.tsx`
plus vendored exports). This task should make it *shorter*, not longer — the
deleted assets drop out. If `card.tsx` appears as unused, your page is not
importing it and the grid is not real; fix that rather than ignoring it.
