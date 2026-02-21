import React from "react";
import { Outlet } from "react-router-dom";
import LeftSide from "../../../components/user/leftSide/leftSide";

const LandingPage = () => {
  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%', overflow: 'hidden' }}>
      <div style={{ width: '64px', flexShrink: 0 }}>
        <LeftSide />
      </div>

      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <Outlet /> 
      </div>
    </div>
  );
};

export default LandingPage;