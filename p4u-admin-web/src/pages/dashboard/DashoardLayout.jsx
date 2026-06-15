import MasterLayout from "../../masterLayout/MasterLayout";
import Breadcrumb from "../../components/Breadcrumb";
import Dashboard from "./Dashboard";

const HomePageOne = () => {
  return (
    <>
      {/* MasterLayout */}
      <MasterLayout>
        {/* Breadcrumb */}
        <Breadcrumb
          pagetitle='Dashboard'
          subtitle='Overview of your marketplace performance'
          title='Dashboard'
        />
        <Dashboard />
      </MasterLayout>
    </>
  );
};

export default HomePageOne;
