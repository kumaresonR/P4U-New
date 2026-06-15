import SalesStatisticOne from "./child/SalesStatisticOne"; 
import UsersOverviewOne from "./child/UsersOverviewOne";
import LatestRegisteredOne from "./child/LatestRegisteredOne"; 
import GeneratedContent from "./child/GeneratedContent";
import UnitCountOne from "./child/UnitCountOne";

const DashBoardLayerOne = () => {
  return (
    <> 
      <UnitCountOne /> 
      <section className='row gy-4 mt-1'>
        {/* SalesStatisticOne */}
        <SalesStatisticOne />
 

        {/* UsersOverviewOne */}
        <UsersOverviewOne />

        {/* LatestRegisteredOne */}
        <LatestRegisteredOne /> 

        {/* GeneratedContent */}
        <GeneratedContent />
      </section>
    </>
  );
};

export default DashBoardLayerOne;
