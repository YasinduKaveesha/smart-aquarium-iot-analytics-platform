import { createBrowserRouter } from "react-router";
import { SimpleOverview } from "./pages/simple/Overview";
import { SimpleStatus } from "./pages/simple/Status";
import { SimpleHistory } from "./pages/simple/History";
import { AdvancedOverview } from "./pages/advanced/Overview";
import { SensorAnalytics } from "./pages/advanced/SensorAnalytics";
import { WQIBreakdown } from "./pages/advanced/WQIBreakdown";
import { Forecast } from "./pages/advanced/Forecast";
import { AnomalyDetection } from "./pages/advanced/AnomalyDetection";
import { FishHealth } from "./pages/advanced/FishHealth";
import { ErrorState } from "./pages/advanced/ErrorState";
import { ModeSelector } from "./pages/ModeSelector";
import { Wireframe } from "./pages/Wireframe";

export const router = createBrowserRouter([
  { path: "/", Component: ModeSelector },
  { path: "/simple", Component: SimpleOverview },
  { path: "/simple/status", Component: SimpleStatus },
  { path: "/simple/history", Component: SimpleHistory },
  { path: "/advanced/overview", Component: AdvancedOverview },
  { path: "/advanced/sensors", Component: SensorAnalytics },
  { path: "/advanced/wqi", Component: WQIBreakdown },
  { path: "/advanced/forecast", Component: Forecast },
  { path: "/advanced/anomaly", Component: AnomalyDetection },
  { path: "/advanced/health", Component: FishHealth },
  { path: "/advanced/error", Component: ErrorState },
  { path: "/wireframe", Component: Wireframe },
]);
