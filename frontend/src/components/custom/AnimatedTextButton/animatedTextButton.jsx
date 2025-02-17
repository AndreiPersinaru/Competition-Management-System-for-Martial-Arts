import { Typography } from "@mui/material";

const AnimatedTextButton = ({ children, onClick, sx }) => {
    return (
        <Typography
            variant="body1"
            onClick={onClick}
            sx={{
                cursor: "pointer",
                transition: "transform 0.2s ease",
                "&:after": {
                    content: '""',
                    position: "absolute",
                    height: "0.2rem",
                    width: 0,
                    left: 0,
                    bottom: "-1.52rem",
                    background: "white",
                },
                "&:hover": {
                    transform: "translateY(-3px)",
                    "&:after": {
                        width: "100%",
                    },
                },
                ...sx,
            }}>
            {children}
        </Typography>
    );
};

export default AnimatedTextButton;
