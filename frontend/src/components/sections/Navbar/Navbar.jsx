import { useState, useEffect, useContext } from "react";
import { AppBar, Toolbar, Typography, Box, IconButton, useMediaQuery, useTheme, Collapse, Container } from "@mui/material";
import { Close, Menu } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../../context/AuthContext";

import AnimatedTextButton from "../../custom/AnimatedTextButton/animatedTextButton";

const Navbar = () => {
    const { logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const [mobileOpen, setMobileOpen] = useState(false);
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("md"));

    useEffect(() => {
        if (!isMobile) {
            setMobileOpen(false);
        }
    }, [isMobile]);

    const navigationItems = [
        { label: "Lorem", path: "/" },
        { label: "Ipsum", path: "/" },
        { label: "Dolor", path: "/" },
        { label: "Sit", path: "/" },
        { label: "Amet", path: "/" },
    ];

    return (
        <AppBar elevation={8}>
            <Toolbar sx={{ flexDirection: "column" }}>
                <Box width="100%" display="flex" justifyContent="space-between" alignItems="center" height="4.5rem">
                    <Typography variant={isMobile ? "h4" : "h3"} ml={{ xs: 1, md: 4 }}>
                        Lorem ipsum
                    </Typography>

                    {!isMobile && (
                        <Box display="flex" gap={4} mr={4}>
                            {navigationItems.map(({ label, path }) => (
                                <AnimatedTextButton key={label} onClick={() => navigate(path)}>
                                    {label}
                                </AnimatedTextButton>
                            ))}
                            <AnimatedTextButton key={"Log out"} onClick={logout}>
                                Log out
                            </AnimatedTextButton>
                        </Box>
                    )}

                    {isMobile && (
                        <IconButton
                            onClick={() => setMobileOpen(!mobileOpen)}
                            sx={{ color: "primary.contrastText", mr: 2, transition: "transform 0.3s ease", transform: mobileOpen ? "rotate(90deg)" : "none" }}
                        >
                            {mobileOpen ? <Close fontSize="large" /> : <Menu fontSize="large" />}
                        </IconButton>
                    )}
                </Box>
            </Toolbar>

            {isMobile && (
                <Collapse in={mobileOpen}>
                    <Container sx={{ display: "flex", flexDirection: "column", pb: 2 }}>
                        {navigationItems.map(({ label, path }) => (
                            <AnimatedTextButton
                                key={label}
                                onClick={() => {
                                    navigate(path);
                                    setMobileOpen(false);
                                }}
                                sx={{ my: 2, width: "100%", textAlign: "end" }}
                            >
                                {label}
                            </AnimatedTextButton>
                        ))}
                    </Container>
                </Collapse>
            )}
        </AppBar>
    );
};

export default Navbar;
