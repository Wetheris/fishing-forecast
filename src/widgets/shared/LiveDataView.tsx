import type { ReactNode } from "react";
import type { LiveSourceState } from "@/types/source-data";
import { WidgetDataMessage } from "@/widgets/shared/WidgetPrimitives";

export function LiveDataView<TData>({
  state,
  sourceName,
  loadingDetail,
  children,
}: {
  state?: LiveSourceState<TData>;
  sourceName: string;
  loadingDetail: string;
  children: (data: TData) => ReactNode;
}) {
  if (!state || state.status === "idle") {
    return (
      <WidgetDataMessage
        title={`Waiting for ${sourceName}`}
        detail="The source has not started loading yet."
      />
    );
  }

  switch (state.status) {
    case "success":
      return <>{children(state.data)}</>;

    case "error":
      return (
        <WidgetDataMessage
          title={`${sourceName} unavailable`}
          detail={state.error}
          tone="error"
        />
      );

    case "loading":
      return (
        <WidgetDataMessage
          title={`Loading ${sourceName}`}
          detail={loadingDetail}
        />
      );  }
}
