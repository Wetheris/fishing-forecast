import type {
  DashboardSource,
  WidgetCategory,
  WidgetInstance,
  WidgetKey,
  WidgetSize,
  SourceKind,
} from "@/types/dashboard";

export type WidgetDefinition = {
  key: WidgetKey;
  name: string;
  description: string;
  category: WidgetCategory;
  sourceKind: SourceKind;
  defaultSize: WidgetSize;
  defaultTitle: string;
};

export type WidgetComponentProps = {
  widget: WidgetInstance;
  source: DashboardSource;
};
