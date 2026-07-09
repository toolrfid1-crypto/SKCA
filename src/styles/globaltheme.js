import { createTheme, alpha } from "@mui/material/styles";

export const oneUxColors = {
  primary: "#00A8A9",
  secondary: "#ED6F2D",
  success: "#4CAF50",
  edit: "#EDAA4D",
  reject: "#ED4D4D",
  error: "#D32F2F",
  disabled: "#B6B6B6",
  white: "#FFFFFF",
  black: "#000000",
  textPrimary: "#000000DE",
  textSecondary: "#00000099",
  border: "#B6B6B6",
  surface: "#FFFFFF",
  pageBackground: "#F7F9FA",
};

const fontFamily = '"IBM Plex Sans Thai", sans-serif';

const globaltheme = createTheme({
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 900,
      lg: 1200,
      xl: 1536,
    },
  },
  palette: {
    mode: "light",
    primary: {
      main: oneUxColors.primary,
      contrastText: oneUxColors.white,
    },
    secondary: {
      main: oneUxColors.secondary,
      contrastText: oneUxColors.white,
    },
    success: {
      main: oneUxColors.success,
      contrastText: oneUxColors.white,
    },
    warning: {
      main: oneUxColors.edit,
      contrastText: oneUxColors.white,
    },
    error: {
      main: oneUxColors.error,
      contrastText: oneUxColors.white,
    },
    text: {
      primary: oneUxColors.textPrimary,
      secondary: oneUxColors.textSecondary,
      disabled: oneUxColors.disabled,
    },
    background: {
      default: oneUxColors.pageBackground,
      paper: oneUxColors.surface,
    },
    divider: alpha(oneUxColors.black, 0.12),
  },
  spacing: 8,
  shape: {
    borderRadius: 8,
  },
  typography: {
    fontFamily,
    h1: {
      fontSize: "1.75rem",
      fontWeight: 600,
      lineHeight: 1.35,
    },
    h2: {
      fontSize: "1.5rem",
      fontWeight: 600,
      lineHeight: 1.35,
    },
    h3: {
      fontSize: "1rem",
      fontWeight: 600,
      lineHeight: 1.5,
    },
    body1: {
      fontSize: "1rem",
      fontWeight: 400,
      lineHeight: 1.6,
    },
    body2: {
      fontSize: "0.875rem",
      fontWeight: 400,
      lineHeight: 1.5,
    },
    button: {
      fontSize: "1rem",
      fontWeight: 500,
      textTransform: "none",
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          fontFamily,
          backgroundColor: oneUxColors.pageBackground,
        },
      },
    },
    MuiAppBar: {
      defaultProps: {
        color: "primary",
        elevation: 2,
      },
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
    MuiToolbar: {
      styleOverrides: {
        root: {
          minHeight: 64,
        },
      },
    },
    MuiButton: {
      defaultProps: {
        variant: "contained",
        disableElevation: false,
      },
      styleOverrides: {
        root: {
          borderRadius: 8,
          minHeight: 40,
          paddingLeft: 24,
          paddingRight: 24,
          boxShadow: "none",
          "&:hover": {
            boxShadow: `0 4px 12px ${alpha(oneUxColors.black, 0.22)}`,
          },
          "&.Mui-disabled": {
            color: oneUxColors.white,
            backgroundColor: oneUxColors.disabled,
          },
        },
        outlined: {
          backgroundColor: oneUxColors.white,
          borderColor: oneUxColors.primary,
          color: oneUxColors.primary,
          "&:hover": {
            backgroundColor: oneUxColors.white,
            borderColor: oneUxColors.primary,
          },
        },
        text: {
          color: oneUxColors.primary,
          "&:hover": {
            backgroundColor: alpha(oneUxColors.primary, 0.08),
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          color: "inherit",
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          backgroundColor: oneUxColors.primary,
          color: oneUxColors.white,
          fontWeight: 500,
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          backgroundColor: oneUxColors.white,
          color: oneUxColors.black,
          borderColor: oneUxColors.border,
          "&:hover": {
            backgroundColor: alpha(oneUxColors.primary, 0.5),
            color: oneUxColors.white,
          },
          "&.Mui-selected": {
            backgroundColor: oneUxColors.primary,
            color: oneUxColors.white,
            "&:hover": {
              backgroundColor: oneUxColors.primary,
            },
          },
        },
      },
    },
    MuiRadio: {
      styleOverrides: {
        root: {
          "&.Mui-checked": {
            color: oneUxColors.primary,
          },
        },
      },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: {
          "&.Mui-checked": {
            color: oneUxColors.primary,
          },
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        switchBase: {
          "&.Mui-checked": {
            color: oneUxColors.primary,
          },
          "&.Mui-checked + .MuiSwitch-track": {
            backgroundColor: oneUxColors.primary,
          },
        },
        track: {
          backgroundColor: oneUxColors.disabled,
        },
      },
    },
    MuiOutlinedInput: {
      defaultProps: {
        size: "small",
      },
      styleOverrides: {
        root: {
          backgroundColor: oneUxColors.white,
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: oneUxColors.primary,
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: oneUxColors.primary,
          },
          "&.Mui-error .MuiOutlinedInput-notchedOutline": {
            borderColor: oneUxColors.error,
          },
        },
        notchedOutline: {
          borderColor: oneUxColors.border,
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        size: "small",
      },
    },
    MuiSelect: {
      defaultProps: {
        size: "small",
      },
    },
    MuiPaginationItem: {
      styleOverrides: {
        root: {
          "&.Mui-selected": {
            backgroundColor: oneUxColors.primary,
            color: oneUxColors.white,
            "&:hover": {
              backgroundColor: oneUxColors.primary,
            },
          },
        },
      },
    },
    MuiBreadcrumbs: {
      styleOverrides: {
        root: {
          fontSize: "1.75rem",
          fontWeight: 600,
          color: oneUxColors.primary,
        },
      },
    },
    MuiPickersDay: {
      styleOverrides: {
        root: {
          "&.Mui-selected": {
            backgroundColor: oneUxColors.primary,
            "&:hover": {
              backgroundColor: oneUxColors.primary,
            },
          },
        },
      },
    },
    MuiClock: {
      styleOverrides: {
        pin: {
          backgroundColor: oneUxColors.primary,
        },
      },
    },
    MuiClockNumber: {
      styleOverrides: {
        selected: {
          color: oneUxColors.primary,
        },
      },
    },
  },
});

export default globaltheme;
