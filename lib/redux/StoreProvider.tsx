"use client";

import { useState } from "react";
import { Provider } from "react-redux";
import { makeStore } from "./store";

export function StoreProvider({ children }: { children: React.ReactNode }) {
  // One store per component instance (not module-level) — required in
  // Next.js App Router so server-rendered requests never share state
  // across users. A lazy useState initializer (not useRef) keeps this
  // safe to read during render — refs are only ever meant to be read
  // outside of render.
  const [store] = useState(() => makeStore());

  return <Provider store={store}>{children}</Provider>;
}
