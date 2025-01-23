import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
    palette: {
        mode: "light",
        primary: {
            main: "#ce2727",
            contrastText: "#fbfbfe",
        },
        secondary: {
            main: "#ffdbdb",
            contrastText: "#040316",
        },
        divider: "#ff3d3d",
        text: {
            primary: "rgb(4, 3, 22)",
            secondary: "rgba(4, 3, 22, 0.6)",
            disabled: "rgba(4, 3, 22, 0.38)",
            hint: "rgb(255, 61, 61)",
        },
        background: {
            default: "#fbfbfe",
        },
    },
    typography: {
        fontFamily: "'Inter', sans-serif",
        h1: {
            fontSize: "4.210rem",
            fontWeight: 700,
        },
        h2: {
            fontSize: "3.158rem",
            fontWeight: 700,
        },
        h3: {
            fontSize: "2.369rem",
            fontWeight: 700,
        },
        h4: {
            fontSize: "1.777rem",
            fontWeight: 700,
        },
        h5: {
            fontSize: "1.333rem",
            fontWeight: 700,
        },
        body1: {
            fontSize: "1rem",
            fontWeight: 400,
        },
        small: {
            fontSize: "0.750rem",
        },
    },
});
