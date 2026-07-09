import React from "react";
import { GlobalStyles, alpha } from "@mui/material";
import { oneUxColors } from "./globaltheme";

const globalstyles = React.createElement(GlobalStyles, {
  styles: {
      "*": {
        boxSizing: "border-box",
      },
      html: {
        minHeight: "100%",
      },
      body: {
        minHeight: "100%",
        margin: 0,
        color: oneUxColors.textPrimary,
        backgroundColor: oneUxColors.pageBackground,
      },
      "#root": {
        minHeight: "100vh",
      },
      "::-webkit-scrollbar": {
        width: 10,
        height: 10,
      },
      "::-webkit-scrollbar-thumb": {
        backgroundColor: alpha(oneUxColors.black, 0.2),
        borderRadius: 8,
      },
      "::-webkit-scrollbar-track": {
        backgroundColor: alpha(oneUxColors.black, 0.04),
      },
    },
});

export default globalstyles;
