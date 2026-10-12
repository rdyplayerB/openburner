import { lazy, Suspense, type ComponentType } from "react";

/** next/dynamic for Ladle: React.lazy with the same loader and loading options. */
export default function dynamic<P extends object>(
  loader: () => Promise<ComponentType<P> | { default: ComponentType<P> }>,
  opts: { loading?: ComponentType; ssr?: boolean } = {}
) {
  const Lazy = lazy(async () => {
    const mod = await loader();
    return { default: (mod as { default?: ComponentType<P> }).default ?? (mod as ComponentType<P>) };
  });
  const Loading = opts.loading;
  return function Dynamic(props: P) {
    return (
      <Suspense fallback={Loading ? <Loading /> : null}>
        <Lazy {...props} />
      </Suspense>
    );
  };
}
