import DashboardSummary from "./DashboardSummary";
import DashboardCharts from "./DashboardCharts";
import DashboardInsights from "./DashboardInsights";

const DashBoardLayerOne = () => {
  return (
    <>
      <DashboardSummary />
      <DashboardCharts />
      <DashboardInsights />
    </>
  );
};

export default DashBoardLayerOne;
