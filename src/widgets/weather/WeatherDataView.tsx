import type { ReactNode } from "react";
import type {
  WeatherSourceData,
  WeatherSourceState,
} from "@/types/weather";
import { WidgetDataMessage } from "@/widgets/shared/WidgetPrimitives";

type WeatherDataViewProps = {
  state?: WeatherSourceState;
  children: (data: WeatherSourceData) => ReactNode;
};

export function WeatherDataView({
  state,
  children,
}: WeatherDataViewProps) {
  if (!state) {
    return (
      <WidgetDataMessage
        title="Waiting for weather"
        detail="The weather source has not started loading yet."
      />
    );
  }

  switch (state.status) {
    case "success":
      return <>{children(state.data)}</>;

    case "error":
      return (
        <WidgetDataMessage
          title="Weather unavailable"
          detail={state.error}
          tone="error"
        />
      );

    case "loading":
      return (
        <WidgetDataMessage
          title="Loading live weather"
          detail="Fetching the latest Open-Meteo forecast."
        />
      );

    case "idle":
      return (
        <WidgetDataMessage
          title="Waiting for weather"
          detail="The weather source has not started loading yet."
        />
      );
  }
}
